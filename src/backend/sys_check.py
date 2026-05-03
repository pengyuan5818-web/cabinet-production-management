#!/usr/bin/env python3
"""橱柜工厂管理系统 - 纯文件分析架构审查"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统'
BACKEND = os.path.join(BASE, 'src', 'backend', 'src')
FRONTEND = os.path.join(BASE, 'src', 'frontend', 'web', 'src')

def list_files(path, ext=None):
    files = []
    for root, dirs, filenames in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', '.nuxt']]
        for f in filenames:
            if ext is None or f.endswith(ext):
                files.append(os.path.join(root, f))
    return files

def get_content(path):
    try:
        return open(path, encoding='utf-8').read()
    except:
        try:
            return open(path, encoding='gbk', errors='ignore').read()
        except:
            return ''

print("=" * 60)
print("一、后端路由文件 (src/backend/src/routes/)")
print("=" * 60)
route_files = list_files(os.path.join(BACKEND, 'routes'), '.js')
print(f"Total: {len(route_files)}")
for f in sorted(route_files):
    print(f"  {os.path.basename(f)}")

print("\n" + "=" * 60)
print("二、前端视图 (src/frontend/web/src/views/)")
print("=" * 60)
views = list_files(os.path.join(FRONTEND, 'views'), '.vue')
print(f"Total: {len(views)}")
for v in sorted(views):
    rel = os.path.relpath(v, os.path.join(FRONTEND, 'views'))
    print(f"  {rel}")

print("\n" + "=" * 60)
print("三、前端 API 导出 (src/frontend/web/src/api/index.js)")
print("=" * 60)
api_content = get_content(os.path.join(FRONTEND, 'api', 'index.js'))
exports = re.findall(r'export\s+const\s+(\w+)\s*=\s*\{', api_content)
print(f"Total: {len(exports)}")
for e in sorted(exports):
    print(f"  {e}")

print("\n" + "=" * 60)
print("四、后端 index.js 路由注册")
print("=" * 60)
index_content = get_content(os.path.join(BACKEND, 'index.js'))
routes = re.findall(r"app\.use\s*\(\s*['\"](/[^'\"]+)['\"]", index_content)
print(f"Total: {len(routes)} registered routes:")
for r in sorted(routes):
    print(f"  {r}")

print("\n" + "=" * 60)
print("五、后端路由 -> 前端 API 匹配检查")
print("=" * 60)
# Extract frontend API paths
fe_paths = re.findall(r"api\.(?:get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]", api_content)
fe_unique = sorted(set(fe_paths))
print(f"Frontend API paths ({len(fe_unique)}):")
for p in fe_unique:
    print(f"  {p}")

print("\n" + "=" * 60)
print("六、后端 SQL 表引用 -> 数据库表对照")
print("=" * 60)
route_files_list = list_files(os.path.join(BACKEND, 'routes'), '.js')
all_db_tables = set()
for rf in route_files_list:
    c = get_content(rf)
    # find all SQL table references
    for m in re.finditer(r'(?:FROM|JOIN\s+|INTO\s+(?!stock_inventory)|UPDATE\s+|INTO\s+)\s*["\']?(\w+)["\']?', c, re.I):
        t = m.group(1).lower()
        # skip SQL keywords
        skip = {'select','where','order','group','limit','inner','left','right','outer','on',
                'as','and','or','not','null','all','having','distinct','count','sum','avg',
                'max','min','case','when','then','else','end','offset','fetch','next','rows',
                'only','returning','current_date','now','coalesce','nullif','extract','date',
                'time','interval','boolean','true','false','string_agg','json_agg','row_number',
                'rank','dense_rank','generate_series'}
        if t not in skip and len(t) > 1:
            all_db_tables.add(t)

# Check which tables exist in init_database.sql
init_sql = get_content(os.path.join(BASE, 'scripts', 'init_database.sql'))
init_tables = set()
for m in re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?', init_sql, re.I):
    init_tables.add(m.group(1).lower())

print(f"Total unique tables referenced in routes: {len(all_db_tables)}")
print(f"Tables defined in init_database.sql: {len(init_tables)}")
missing_from_sql = all_db_tables - init_tables
print(f"\nTables referenced in routes but NOT in init_database.sql ({len(missing_from_sql)}):")
for t in sorted(missing_from_sql):
    print(f"  [MISSING] {t}")

# Check init.sql for migration tables
init_sql_path = os.path.join(BASE, 'scripts', 'init.sql')
if os.path.exists(init_sql_path):
    init2 = get_content(init_sql_path)
    init2_tables = set()
    for m in re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?', init2, re.I):
        init2_tables.add(m.group(1).lower())
    missing_from_sql2 = all_db_tables - init_tables - init2_tables
    if missing_from_sql2:
        print(f"\nAlso missing from init.sql ({len(missing_from_sql2)}):")
        for t in sorted(missing_from_sql2):
            print(f"  [MISSING] {t}")

print("\n" + "=" * 60)
print("七、前端路由 vs 后端注册 vs 前端API 完整性")
print("=" * 60)
# Extract frontend router paths
router_content = get_content(os.path.join(FRONTEND, 'router', 'index.js'))
fe_router_paths = re.findall(r"path:\s*['\"]([^'\"]+)['\"]", router_content)
print(f"Frontend router paths ({len(set(fe_router_paths))}):")
for p in sorted(set(fe_router_paths)):
    print(f"  {p}")

# Extract menu/sidebar entries
sidebar_content = get_content(os.path.join(FRONTEND, 'views', 'layout', 'index.vue'))
menu_paths = re.findall(r"path:\s*['\"]([^'\"]+)['\"]", sidebar_content)
menu_names = re.findall(r'<span>([^<]{2,20})</span>', sidebar_content)
print(f"\nSidebar menu items ({len(menu_names)}):")
for n in menu_names[:30]:
    print(f"  - {n}")

print("\n" + "=" * 60)
print("八、字段命名一致性检查")
print("=" * 60)
# Check status field naming across key tables
key_tables_content = {}
for rf in route_files_list:
    c = get_content(rf)
    fname = os.path.basename(rf)
    key_tables_content[fname] = c

# Common field name issues to check:
# - status vs status_name vs status_text
# - remark vs remarkes (typo)
# - created_by vs creater vs creator
# - updated_by vs updater
print("Checking common field naming patterns in routes:")

for fname, content in sorted(key_tables_content.items()):
    # status field variations
    status_refs = re.findall(r'\b(status|status_name|status_text|status_code)\b', content, re.I)
    if status_refs:
        unique = sorted(set(s.lower() for s in status_refs))
        print(f"\n  [{fname}] status fields: {unique}")

    # remark field variations
    remark_refs = re.findall(r'\b(remark|remarkes|note|notes|memo)\b', content, re.I)
    if remark_refs:
        unique = sorted(set(r.lower() for r in remark_refs))
        print(f"  [{fname}] remark fields: {unique}")

print("\n" + "=" * 60)
print("九、多币种字段检查（路由代码中）")
print("=" * 60)
currency_tables = ['order_master', 'order_detail', 'receivable', 'payable', 'fund_flow',
                  'collection_record', 'payment_record', 'invoice', 'stock_in', 'stock_out']
for fname, content in sorted(key_tables_content.items()):
    for tbl in currency_tables:
        if tbl in content:
            # check if currency field is referenced
            has_currency = 'currency' in content.lower()
            has_cny = '_cny' in content.lower()
            if has_currency or has_cny:
                print(f"  [{fname}] mentions {tbl}: currency={has_currency}, _cny={has_cny}")

print("\n" + "=" * 60)
print("十、缺失功能模块检查")
print("=" * 60)
# Check if all frontend views have corresponding backend routes
view_dirs = set()
for v in views:
    rel = os.path.relpath(v, os.path.join(FRONTEND, 'views'))
    module = rel.split(os.sep)[0] if os.sep in rel else rel.split('\\')[0]
    view_dirs.add(module)

route_modules = set()
for rf in route_files:
    name = os.path.basename(rf, '.js')
    route_modules.add(name)

backend_api = set()
for r in routes:
    backend_api.add(r.lstrip('/').split('/')[0])

print(f"Frontend view modules ({len(view_dirs)}): {sorted(view_dirs)}")
print(f"\nBackend route modules ({len(route_modules)}): {sorted(route_modules)}")
print(f"\nBackend registered API prefix ({len(backend_api)}): {sorted(backend_api)}")

# Find unmatched
fe_no_be = view_dirs - route_modules - {'dealer-portal', 'layout', 'login'}
print(f"\nFrontend has but NO backend route: {sorted(fe_no_be)}")
be_no_fe = route_modules - view_dirs
print(f"Backend has but NO frontend view: {sorted(be_no_fe)}")

print("\n" + "=" * 60)
print("Done.")
print("=" * 60)
