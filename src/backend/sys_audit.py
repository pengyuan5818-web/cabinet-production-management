#!/usr/bin/env python3
"""橱柜工厂管理系统 - 全面架构审查"""
import os, re, subprocess, sys

BASE = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统'
BACKEND = os.path.join(BASE, 'src', 'backend', 'src')
FRONTEND_WEB = os.path.join(BASE, 'src', 'frontend', 'web', 'src')
DB_SCRIPT = os.path.join(BASE, 'scripts', 'init_database.sql')

def list_dir(path, ext=None):
    files = []
    for root, dirs, filenames in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist']]
        for f in filenames:
            if ext is None or f.endswith(ext):
                files.append(os.path.join(root, f))
    return files

print("=" * 60)
print("一、后端路由文件检查")
print("=" * 60)
route_dir = os.path.join(BACKEND, 'routes')
route_files = list_dir(route_dir, '.js')
print(f"共 {len(route_files)} 个路由文件：")
for f in sorted(route_files):
    print(f"  {os.path.basename(f)}")

print("\n" + "=" * 60)
print("二、前端视图文件检查")
print("=" * 60)
views_dir = os.path.join(FRONTEND_WEB, 'views')
view_files = list_dir(views_dir, '.vue')
print(f"共 {len(view_files)} 个视图文件：")
for f in sorted(view_files):
    rel = os.path.relpath(f, views_dir)
    print(f"  {rel}")

print("\n" + "=" * 60)
print("三、前端 API 导出检查")
print("=" * 60)
api_file = os.path.join(FRONTEND_WEB, 'api', 'index.js')
if os.path.exists(api_file):
    content = open(api_file, encoding='utf-8').read()
    exports = re.findall(r'export\s+const\s+(\w+)\s*=\s*\{', content)
    print(f"共 {len(exports)} 个 API 模块：")
    for e in sorted(exports):
        print(f"  {e}")

print("\n" + "=" * 60)
print("四、数据库表清单")
print("=" * 60)
result = subprocess.run([
    'psql', 'postgresql://postgres:postgres@localhost:5432/cabinet_factory',
    '-c', "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
], capture_output=True, text=True, timeout=10, env=dict(os.environ, PGPASSWORD='postgres'))
tables = [l.strip() for l in result.stdout.strip().split('\n') if l.strip() and l.strip() != 'tablename' and '---' not in l]
print(f"共 {len(tables)} 张表：")
for t in tables:
    print(f"  {t}")

print("\n" + "=" * 60)
print("五、后端路由 → 数据库表 引用审查")
print("=" * 60)
# 从后端代码中提取所有 SQL 表引用
all_route_files = list_dir(route_dir, '.js')
table_refs = {}
for rf in all_route_files:
    content = open(rf, encoding='utf-8').read()
    # 找 FROM/JOIN/INTO 表名
    found_tables = set()
    for m in re.finditer(r'(?:FROM|JOIN\s+|INTO\s+|UPDATE\s+|INTO\s+)\s*"?(\w+)"?', content, re.I):
        t = m.group(1).lower()
        if t not in ('select', 'where', 'order', 'group', 'limit', 'inner', 'left', 'right', 'outer', 'on', 'as', 'and', 'or', 'not', 'null', 'all'):
            found_tables.add(t)
    if found_tables:
        route_name = os.path.basename(rf)
        table_refs[route_name] = found_tables

for route, tables in sorted(table_refs.items()):
    for t in sorted(tables):
        print(f"  {route} → {t}")

print("\n" + "=" * 60)
print("六、前端 API → 后端路由 匹配检查")
print("=" * 60)
if os.path.exists(api_file):
    api_content = open(api_file, encoding='utf-8').read()
    # 提取所有 api.get/post/put/delete 调用路径
    fe_paths = set()
    for m in re.finditer(r"api\.(?:get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]", api_content):
        path = m.group(1)
        fe_paths.add(path)
    
    # 后端注册的路由路径
    index_file = os.path.join(BACKEND, 'index.js')
    be_paths = set()
    if os.path.exists(index_file):
        index_content = open(index_file, encoding='utf-8').read()
        for m in re.finditer(r"app\.use\s*\(\s*['\"](/[^'\"]+)['\"]", index_content):
            be_paths.add(m.group(1))
    
    print(f"前端 API 路径数：{len(fe_paths)}")
    print(f"后端注册路由数：{len(be_paths)}")
    
    # 提取后端路由处理的路径（从routes文件中）
    route_handlers = {}
    for rf in all_route_files:
        content = open(rf, encoding='utf-8').read()
        for m in re.finditer(r"(?:router\.(?:get|post|put|delete|patch|all))\s*\(\s*['\"]([^'\"]*)['\"]", content):
            p = m.group(1)
            route_file = os.path.basename(rf)
            if route_file not in route_handlers:
                route_handlers[route_file] = []
            route_handlers[route_file].append(p)
    
    print("\n后端路由处理路径：")
    for rf, paths in sorted(route_handlers.items()):
        for p in paths:
            print(f"  {rf}: {p}")
