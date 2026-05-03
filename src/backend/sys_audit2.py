#!/usr/bin/env python3
"""橱柜工厂管理系统 - 数据库层审查（用 psycopg2）"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统'

try:
    import psycopg2
    HAS_PSYCOPG2 = True
except:
    HAS_PSYCOPG2 = False
    print("psycopg2 not available, using raw SQL file analysis")

conn = None
cursor = None

def q(sql):
    try:
        cursor.execute(sql)
        return cursor.fetchall()
    except Exception as e:
        return [f"ERROR: {e}"]

if HAS_PSYCOPG2:
    try:
        conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/cabinet_factory')
        cursor = conn.cursor()
        print("✅ 数据库连接成功")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        exit(1)

# 1. 表清单
print("\n" + "=" * 60)
print("一、数据库表清单")
print("=" * 60)
tables = q("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
table_list = [r[0] for r in tables if isinstance(r[0], str)]
print(f"共 {len(table_list)} 张表：")
for t in table_list:
    print(f"  {t}")

# 2. 关键表的字段（统一性检查）
print("\n" + "=" * 60)
print("二、关键表字段统一性检查")
print("=" * 60)

def get_columns(tbl):
    rows = q(f"""SELECT column_name, data_type, is_nullable 
                 FROM information_schema.columns 
                 WHERE table_name = '{tbl}' 
                 ORDER BY ordinal_position""")
    return [(r[0], r[1], r[2]) for r in rows if isinstance(r[0], str)]

key_tables = ['order_master', 'order_detail', 'order_bom', 'receivable', 'payable', 
              'fund_flow', 'collection_record', 'payment_record', 'invoice',
              'stock_in', 'stock_out', 'employee', 'customer', 'dealer', 'supplier',
              'production_schedule', 'quality_record', 'design_drawing', 'design_record',
              'warehouse_location', 'package_record', 'sort_task', 'installation_task']

for tbl in key_tables:
    if tbl in table_list:
        cols = get_columns(tbl)
        print(f"\n  [{tbl}] ({len(cols)} 字段)")
        for c, t, n in cols:
            null = 'NULL' if n == 'YES' else 'NOT NULL'
            print(f"    {c}: {t} ({null})")
    else:
        print(f"\n  [{tbl}] ❌ 表不存在")

# 3. 金额字段类型检查
print("\n" + "=" * 60)
print("三、金额字段类型检查（应统一为 numeric/decimal）")
print("=" * 60)
money_tables = ['order_master', 'order_detail', 'receivable', 'payable', 'fund_flow', 
                'collection_record', 'payment_record', 'invoice', 'stock_in', 'stock_out']
for tbl in money_tables:
    if tbl in table_list:
        cols = get_columns(tbl)
        money_cols = [(c, t) for c, t, _ in cols if any(k in c.lower() for k in ['amount', 'price', 'total', 'balance', 'deposit', 'fee', 'cost'])]
        if money_cols:
            print(f"\n  [{tbl}]")
            for c, t in money_cols:
                status = '✅' if t in ('numeric', 'decimal') else '❌'
                print(f"    {status} {c}: {t}")

# 4. 时间字段检查
print("\n" + "=" * 60)
print("四、时间字段检查（应统一为 created_at/updated_at）")
print("=" * 60)
for tbl in ['order_master', 'employee', 'customer', 'dealer', 'supplier']:
    if tbl in table_list:
        cols = get_columns(tbl)
        time_cols = [(c, t) for c, t, _ in cols if 'at' in c.lower() or 'date' in c.lower()]
        if time_cols:
            print(f"\n  [{tbl}]: {[c for c, _ in time_cols]}")
        else:
            print(f"\n  [{tbl}]: 无时间字段")

# 5. 枚举字段检查
print("\n" + "=" * 60)
print("五、状态字段类型（应为 ENUM 或 varchar）")
print("=" * 60)
for tbl in ['order_master', 'customer', 'dealer', 'production_schedule', 'receivable', 'payable', 'quality_record']:
    if tbl in table_list:
        cols = get_columns(tbl)
        status_cols = [(c, t) for c, t, _ in cols if 'status' in c.lower()]
        if status_cols:
            print(f"\n  [{tbl}]: {status_cols}")

# 6. 外键约束检查
print("\n" + "=" * 60)
print("六、外键约束检查")
print("=" * 60)
fks = q("""SELECT conname, conrelid::regclass AS table_from, confrelid::regclass AS table_to 
            FROM pg_constraint WHERE contype = 'f' ORDER BY conrelid""")
fk_list = [(r[0], r[1], r[2]) for r in fks if isinstance(r[0], str)]
print(f"共 {len(fk_list)} 个外键约束：")
for name, frm, to in fk_list:
    print(f"  {frm} → {to} ({name})")

# 7. 检查哪些表缺少多币种字段
print("\n" + "=" * 60)
print("七、多币种字段检查（应含 currency + *_cny 字段）")
print("=" * 60)
currency_tables = ['order_master', 'order_detail', 'receivable', 'payable', 'fund_flow',
                   'collection_record', 'payment_record', 'invoice', 'stock_in', 'stock_out']
for tbl in currency_tables:
    if tbl in table_list:
        cols = get_columns(tbl)
        has_currency = any(c[0] == 'currency' for c in cols)
        cny_fields = [c[0] for c in cols if c[0].endswith('_cny')]
        status = '✅' if has_currency else '❌'
        print(f"  {status} [{tbl}] currency={'有' if has_currency else '无'} _cny字段={cny_fields}")

# 8. 缺失的表（代码引用但数据库不存在）
print("\n" + "=" * 60)
print("八、缺失表检查（代码引用但数据库不存在的表）")
print("=" * 60)
all_cols = {tbl: get_columns(tbl) for tbl in table_list}

# 从 init_database.sql 中提取所有 CREATE TABLE 语句的表名
init_sql = os.path.join(BASE, 'scripts', 'init_database.sql')
defined_tables = set()
if os.path.exists(init_sql):
    content = open(init_sql, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?', content, re.I):
        defined_tables.add(m.group(1).lower())

# 数据库有但 SQL 文件没有的（可能是迁移创建的）
extra_in_db = set(table_list) - defined_tables
print(f"\n数据库有但 init_database.sql 没有的表（共 {len(extra_in_db)} 个）：")
for t in sorted(extra_in_db):
    print(f"  {t}")

# 9. init_database.sql 中定义但数据库没有的表
missing_from_db = defined_tables - set(table_list)
print(f"\ninit_database.sql 定义但数据库没有的表（共 {len(missing_from_db)} 个）：")
for t in sorted(missing_from_db):
    print(f"  {t}")

if conn:
    conn.close()
