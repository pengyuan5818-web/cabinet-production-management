"""
橱柜工厂管理系统完整审查
1. 数据库表是否存在
2. 后端路由文件的表引用 vs 数据库实际表名
3. 前端API导出 vs 视图使用
4. P0问题确认
"""
import subprocess, json

# 1. 获取所有数据库表
def psql_query(sql):
    result = subprocess.run(
        ['node', 'list_tables.js'],
        capture_output=True, text=True,
        cwd=r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend'
    )
    return result.stdout.strip().split('\n') if result.stdout else []

# 2. 检查后端路由引用的表
import os, re

db_tables_raw = subprocess.run(
    ['node', 'list_tables.js'],
    capture_output=True, text=True,
    cwd=r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend'
)
all_db_tables = set(db_tables_raw.stdout.strip().split('\n'))

route_dir = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes'

print("=" * 60)
print("后端路由引用的表 vs 数据库")
print("=" * 60)

for fname in sorted(os.listdir(route_dir)):
    if not fname.endswith('.js'): continue
    fpath = os.path.join(route_dir, fname)
    content = open(fpath, encoding='utf-8', errors='ignore').read()
    
    # 找所有表引用
    tables = set(re.findall(r'(?:FROM|INTO|UPDATE|JOIN\s+)\s+(\w+)', content, re.IGNORECASE))
    # 清理子查询别名等
    tables = {t.lower() for t in tables if t.lower() not in ('select', 'where', 'order', 'group', 'limit', 'offset', 'set')}
    
    missing = [t for t in tables if t not in all_db_tables]
    if missing:
        print(f"\n[{fname}] 引用了不存在的表:")
        for t in sorted(set(missing)):
            print(f"  - {t}")

print("\n" + "=" * 60)
print("数据库中带installation相关的表")
print("=" * 60)
for t in sorted(all_db_tables):
    if 'install' in t:
        print(f"  {t}")

print("\n" + "=" * 60)
print("检查 cabinet_board 的 length/width 类型")
print("=" * 60)
result = subprocess.run(
    ['node', '-e', '''
const {Client} = require('pg');
(async()=>{
    const c = new Client({host:'localhost',port:5432,database:'cabinet_factory',user:'postgres',password:'postgres'});
    await c.connect();
    const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='cabinet_board' AND column_name IN ('length','width')");
    r.rows.forEach(row => console.log(row.column_name + ': ' + row.data_type));
    await c.end();
})()
'''],
    capture_output=True, text=True,
    cwd=r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend'
)
print(result.stdout or result.stderr)

print("=" * 60)
print("检查 fund_flow.order_id 是否有外键约束")
print("=" * 60)
result = subprocess.run(
    ['node', '-e', '''
const {Client} = require('pg');
(async()=>{
    const c = new Client({host:'localhost',port:5432,database:'cabinet_factory',user:'postgres',password:'postgres'});
    await c.connect();
    const r = await c.query("SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='fund_flow' AND constraint_type='FOREIGN KEY' AND column_name='order_id'");
    console.log('fund_flow.order_id foreign keys:', r.rows.map(x=>x.constraint_name).join(', ') || 'NONE');
    await c.end();
})()
'''],
    capture_output=True, text=True,
    cwd=r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend'
)
print(result.stdout or result.stderr)
