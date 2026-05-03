path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Fix: The interval params need their OWN unique $N numbers, not reusing existing ones.
# Also need to append the interval string values to the params array.

# Find lines 154, 156, 161, 162 and fix them
# Line 154: CURRENT_TIMESTAMP - ($1::text)::interval  -> should be $13 (next available)
# But we need to ADD the interval value to params array.

# Strategy: Scan all lines with /* interval:X */ markers.
# For each, find the params array and add the interval value.
# Also fix the $N number to be the correct one (sequential from where existing params end).

import re

new_lines = []
# Track how many extra params we've added so far (for numbering)
extra_param_counter = [0]

for lineno, line in enumerate(lines, 1):
    if '/* interval:' in line:
        # Count how many interval markers in this line
        markers = re.findall(r'/\* interval:([^ ]+) \*/', line)
        num_intervals = len(markers)
        
        # Find the params array end position
        # The line looks like: ...NOW())', [doorId, order.id, 'D' + ..., ..., 'completed', '仓库A']);
        # We need to find the closing ']);'
        
        # Find last occurrence of "]);" in line
        end_pos = line.rfind(']);')
        if end_pos == -1:
            print(f"WARNING line {lineno}: no ']);' found")
            new_lines.append(line)
            continue
        
        # Find the opening '[' for params array - search backwards from end_pos
        # We want the last ', [' before end_pos
        bracket_pos = line.rfind(', [')
        if bracket_pos == -1 or bracket_pos > end_pos:
            print(f"WARNING line {lineno}: no params array found")
            new_lines.append(line)
            continue
        
        params_before = line[bracket_pos+3:end_pos]  # content between '[', ']);'
        
        # Count existing params (split by comma, but be careful with nested structures)
        # For simplicity, count commas + 1, but skip string literals
        # Actually, let's just count the number of '$N' in the SQL part before the array
        # Find the SQL string end - it's the last ')'', before the params
        # The query call is: await client.query('...SQL...', [params])
        
        # Extract the SQL part (between query(' and the last ',
        query_match = re.search(r"query\('(.+?)',\s*\[", line)
        if not query_match:
            # Try double-quoted
            query_match = re.search(r'query\("(.+?)",\s*\[', line)
        
        if query_match:
            sql_part = query_match.group(1)
            # Count $N references in SQL
            dollar_refs = re.findall(r'\$(\d+)', sql_part)
            if dollar_refs:
                max_param = max(int(d) for d in dollar_refs)
            else:
                max_param = 0
        else:
            max_param = 0
        
        # Now for each interval marker, we need to:
        # 1. Replace the comment with a $N reference starting from max_param+1
        # 2. Append the interval value to the params array
        
        new_line = line
        for j, marker_val in enumerate(markers):
            new_param_num = max_param + j + 1
            # Replace the comment with the actual param
            new_line = new_line.replace(f'/* interval:{marker_val} */', f'${new_param_num}')
            # Add interval value to params array
            # The interval value format is like '3 days', '2 days', '1 day'
            # Insert it just before the ']);'
            insert_str = f", '{marker_val}'"
            new_line = new_line[:end_pos] + insert_str + new_line[end_pos:]
            end_pos += len(insert_str)  # adjust position for next insert
        
        new_lines.append(new_line)
    else:
        new_lines.append(line)

new_content = '\n'.join(new_lines)
open(path, 'w', encoding='utf-8').write(new_content)
print('Done')
print('Total lines:', new_content.count('\n'))

# Verify line 154
print('\nLine 154:')
print(lines[153][:200])
print('\nNew line 154:')
print(new_content.split('\n')[153][:200])
