#!/usr/bin/env python3
"""数据库真实表清单 + init_database.sql 对照"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统'

def get_content(path):
    for enc in ['utf-8', 'gbk', 'latin1']:
        try:
            return open(path, encoding=enc).read()
        except:
            pass
    return ''

# 用 Node.js 执行 psql 因为 Python psql 不在 PATH
import subprocess

result = subprocess.run([
    r'C:\Program Files\PostgreSQL\18\bin\psql.exe',
    'postgresql://postgres:postgres@localhost:5432/cabinet_factory',
    '-c', "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
], capture_output=True, text=True, timeout=10, env=dict(os.environ, PGPASSWORD='postgres'))

db_tables = []
for line in result.stdout.split('\n'):
    line = line.strip()
    if line and line not in ('tablename', '-', '') and not line.startswith('('):
        # skip separator lines like (5 rows)
        if '(' not in line and ')' not in line:
            db_tables.append(line)

print(f"Database has {len(db_tables)} tables:")
for t in sorted(db_tables):
    print(f"  {t}")

# Parse init_database.sql
init_sql = get_content(os.path.join(BASE, 'scripts', 'init_database.sql'))
init_tables = set()
for m in re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?', init_sql, re.I):
    init_tables.add(m.group(1).lower())

print(f"\ninit_database.sql defines {len(init_tables)} tables")

# Find all migration SQL files
migrations_dir = os.path.join(BASE, 'scripts', 'migrations')
migration_tables = set()
if os.path.exists(migrations_dir):
    for mf in os.listdir(migrations_dir):
        if mf.endswith('.sql'):
            content = get_content(os.path.join(migrations_dir, mf))
            for m in re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?', content, re.I):
                migration_tables.add(m.group(1).lower())

print(f"Migration scripts define {len(migration_tables)} additional tables")

# Tables in DB but not in any SQL file
all_sql_tables = init_tables | migration_tables
missing_from_sql = set(db_tables) - all_sql_tables
print(f"\nTables in DB but NOT in any SQL file ({len(missing_from_sql)}):")
for t in sorted(missing_from_sql):
    print(f"  [EXTRA in DB] {t}")

# Tables referenced in code but not in DB
# We'll parse route files for table references
route_dir = os.path.join(BASE, 'src', 'backend', 'src', 'routes')
route_tables = set()
skip_words = {'select','where','order','group','limit','inner','left','right','outer','on',
              'as','and','or','not','null','all','having','distinct','count','sum','avg',
              'max','min','case','when','then','else','end','offset','fetch','next','rows',
              'only','returning','current_date','now','coalesce','nullif','extract','date',
              'time','interval','boolean','true','false','string_agg','json_agg','row_number',
              'rank','dense_rank','generate_series','lateral','unnest','cross','full',
              'right','inner','left','outer','using','between','like','ilike','in','exists',
              'any','some','array','json','jsonb','xml','hstore','point','line','lseg',
              'box','circle','path','polygon','inet','cidr','macaddr','uuid','ltree',
              'tsvector','tsquery','pg_catalog','information_schema','pg_tables','pg_class'}
for fname in os.listdir(route_dir):
    if not fname.endswith('.js'):
        continue
    content = get_content(os.path.join(route_dir, fname))
    # Find table names in SQL: FROM xxx, JOIN xxx, INTO xxx, UPDATE xxx
    for m in re.finditer(r'(?:FROM|JOIN\s+|INTO\s+(?!stock_inventory\b)|UPDATE\s+|DELETE\s+FROM)\s+["`]?(\w+)["`]?', content, re.I):
        t = m.group(1).lower()
        if t not in skip_words and len(t) > 2:
            route_tables.add(t)

ref_not_in_db = route_tables - set(db_tables)
print(f"\nTables referenced in routes but NOT in DB ({len(ref_not_in_db)}):")
for t in sorted(ref_not_in_db):
    print(f"  [MISSING in DB] {t}")

# Check which route references which missing table
print("\nWhich route references which missing table:")
for fname in sorted(os.listdir(route_dir)):
    if not fname.endswith('.js'):
        continue
    content = get_content(os.path.join(route_dir, fname))
    missing_refs = []
    for m in re.finditer(r'(?:FROM|JOIN\s+|INTO\s+(?!stock_inventory\b)|UPDATE\s+|DELETE\s+FROM)\s+["`]?(\w+)["`]?', content, re.I):
        t = m.group(1).lower()
        if t in ref_not_in_db:
            missing_refs.append(t)
    if missing_refs:
        print(f"  {fname}: {sorted(set(missing_refs))}")
