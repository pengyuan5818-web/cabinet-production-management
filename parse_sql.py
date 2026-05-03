import re
import os
from pathlib import Path

sql_dir = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\scripts\migrations'
out = []

for f in sorted(Path(sql_dir).glob('*.sql')):
    content = f.read_text(encoding='utf-8')
    # Find all CREATE TABLE statements
    tables = re.findall(r'CREATE TABLE IF NOT EXISTS "?(\w+)"?\s*\((.+?)\)\s*;', content, re.DOTALL | re.IGNORECASE)
    for tbl, cols_block in tables:
        out.append(f'\n### {tbl}')
        # Split columns - simple approach: each line is a column definition
        lines = [l.strip() for l in cols_block.split('\n') if l.strip()]
        for line in lines:
            # Extract column name (first word)
            parts = line.split()
            if parts:
                first = parts[0].strip('",')
                # Check if it looks like a column (not constraint)
                if first and first.lower() not in ('constraint', 'unique', 'primary', 'foreign', 'key', 'check', 'constraint'):
                    col_type = ' '.join(parts[1:4]) if len(parts) > 1 else ''
                    out.append(f'  {first}  {col_type}')

print('\n'.join(out))
