path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Fix INTERVAL escaping issues in JS single-quoted strings.
# Replace:  CURRENT_TIMESTAMP-E'INTERVAL ''N days''
# With:     CURRENT_TIMESTAMP - ($N::text)::interval
# And add the interval string as a parameter.

# Each occurrence needs a unique $N placeholder.
# Strategy: for each occurrence, replace with ($NEXT_PARAM::text)::interval
# and append the interval value to the params array.

import re

# We'll scan the file line by line and fix query() calls that have INTERVAL expressions.
lines = content.split('\n')
new_lines = []

# Track additional params to add per query call
# We work on a best-effort basis: for each line with INTERVAL, we convert to param style
i = 0
param_counter = [1]

def get_next_param():
    n = param_counter[0]
    param_counter[0] += 1
    return f"${n}"

# Process each line
for lineno, line in enumerate(lines, 1):
    if 'INTERVAL' in line and 'E' in line and "E'INTERVAL" in line:
        # This line has the problematic E'INTERVAL ''N days'' pattern
        # Replace CURRENT_TIMESTAMP-E'INTERVAL ''N days'' with CURRENT_TIMESTAMP - ($NEW_PARAM::text)::interval
        # We need to find the specific pattern and replace it
        
        # Pattern: CURRENT_TIMESTAMP-E'INTERVAL ''N days''
        # Replace with: CURRENT_TIMESTAMP - ($NEW_PARAM::text)::interval
        # But we need to track what 'N days' value to add as param
        
        # Find all occurrences in this line
        pattern = r"CURRENT_TIMESTAMP-E'INTERVAL ''([^']+)''"
        
        def fix_interval_match(m):
            days = m.group(1)
            param = get_next_param()
            # We'll append this to a comment marker so we can find it later when adding params
            # Actually, just replace and add param at end of array
            return f"CURRENT_TIMESTAMP - ({param}::text)::interval /* interval:{days} */"
        
        new_line = re.sub(pattern, fix_interval_match, line)
        
        # Now we need to add the interval value to the params array.
        # Find the params array at the end of the line: ], [a, b, c])
        # We need to extract current params and append the interval values.
        # The interval values are tracked via the /* interval:X */ comments.
        
        # Extract interval values from comments
        interval_vals = re.findall(r'/\* interval:([^ ]+) \*/', new_line)
        
        if interval_vals:
            # Find the params array and append interval values
            # The params are at the end: ], [a, b, c])
            # We need to add interval_vals before the final ])
            
            # Find the last ] in the line that has array content
            # Pattern: ], [param1, param2, ...])
            # We want to add interval_vals to the [param1, ...] part
            
            # Find the query(...'...', [params]) pattern
            # The params array is after the last ', [' 
            last_bracket_start = new_line.rfind(', [')
            if last_bracket_start >= 0:
                # Find the closing ]) after this
                array_start = last_bracket_start + 3  # skip ', ['
                # Find matching ]
                depth = 1
                pos = array_start
                while pos < len(new_line) and depth > 0:
                    if new_line[pos] == '[':
                        depth += 1
                    elif new_line[pos] == ']':
                        depth -= 1
                    pos += 1
                # pos is now at the ] that closes depth 0
                array_content = new_line[array_start:pos-1]
                closing = new_line[pos-1:pos+2]  # ]) 
                
                # Build new array content
                new_array_content = array_content
                for iv in interval_vals:
                    new_array_content += f", '{iv}'"
                
                new_line = new_line[:array_start] + new_array_content + ']' + closing
                # Remove the /* interval:X */ comments
                new_line = re.sub(r'\s*/\* interval:[^ ]+ \*/', '', new_line)
        
        new_lines.append(new_line)
    else:
        new_lines.append(line)

new_content = '\n'.join(new_lines)
open(path, 'w', encoding='utf-8').write(new_content)
print('Done')
print('Total lines:', new_content.count('\n'))
print('Param counter:', param_counter[0] - 1)
