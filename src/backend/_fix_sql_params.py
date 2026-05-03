path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Fix: Replace hard-coded INTERVAL expressions inside JS single-quoted strings
# with $N parameter references, and add the values to the params arrays.
#
# Pattern A: CURRENT_TIMESTAMP-INTERVAL '3 days'
#   -> CURRENT_TIMESTAMP-$N  (add '3 days' to params)
#
# We need to find each occurrence and update both the SQL and params.

import re

# First, find all INTERVAL expressions and their context
interval_pattern = re.compile(r"CURRENT_TIMESTAMP-INTERVAL\s+'([^']+)'")

# Replace each occurrence
def replace_interval(match):
    interval_val = match.group(1)
    return f"CURRENT_TIMESTAMP-$N_INTERPOLATE_{interval_val}"

new_content = interval_pattern.sub(replace_interval, content)

# Now fix each unique interval value by replacing $N_INTERPOLATE_xxx with actual $N
# and adding to params arrays
# We need to be careful: each occurrence needs its own $N placeholder
# Strategy: for each occurrence, replace with $P{counter} and track the value

counter = [0]
occurrences = []

def replace_occurrence(match):
    before = match.group(1)  # SQL before the interval ref
    interval_val = match.group(2)
    after = match.group(3)  # SQL after
    idx = counter[0]
    counter[0] += 1
    occurrences.append((idx, interval_val))
    return before + f"$P{idx}" + after

# Pattern to find CURRENT_TIMESTAMP-$N_INTERPOLATE_xxx followed by ,param_count
# Actually, let's do a simpler approach: replace all at once with unique $N

new_content2 = []
i = 0
for m in re.finditer(r"CURRENT_TIMESTAMP-\$N_INTERPOLATE_([^\s,]+)", new_content):
    val = m.group(1)
    new_content2.append(new_content[i:m.start()])
    new_content2.append(f"$P{i}_{val}")
    occurrences.append(val)
    i += 1
new_content2.append(new_content[m.end():])
new_content = ''.join(new_content2)

# Now we have $P0_3 days, $P1_2 days, etc. in the SQL
# We need to add param values to the query() calls
# Pattern: query("... $P0_3 days ...", [old_params])
# Add '3 days' to the end of each params array that uses $P0

for idx, val in enumerate(occurrences):
    # Find all query calls that use $P{idx}
    # Add the interval value to the params array
    # This is tricky to do with regex...
    pass

# Actually, let's take a cleaner approach.
# For each query(...) call that has a $P{N}_interval_val placeholder,
# we add the interval_val as the next param.
# And we replace $P{N}_interval_val with $P{N} in the SQL.

# Let me rebuild this more carefully.
# Instead of complex regex, let's rewrite the SQL to use inline interval with proper escaping.

# The issue is specifically these lines have: CURRENT_TIMESTAMP-INTERVAL 'N days'
# and the string is inside a JS single-quoted string.
# Fix: use double-quoted JS string for this query, so \' works correctly.

# Alternative: wrap the SQL in backticks (template literal) - but that requires templateLiteralFunction
# Alternative: just use string concatenation

# Simplest fix: find the exact problematic line and use template literal
# Even simpler: use double-quote for the JS string and escape any internal double quotes.

# Let's check how many lines have the INTERVAL issue
lines = content.split('\n')
interval_lines = []
for lineno, line in enumerate(lines, 1):
    if 'INTERVAL' in line and 'CURRENT_TIMESTAMP' in line:
        interval_lines.append((lineno, line))

print(f"INTERVAL lines found: {len(interval_lines)}")
for ln, l in interval_lines:
    # Find the exact INTERVAL substring
    idx = l.find('INTERVAL')
    print(f"  Line {ln}: ...{l[max(0,idx-20):idx+40]}...")

# New strategy: replace CURRENT_TIMESTAMP-INTERVAL 'N days' with
# DATE_SUB(CURRENT_TIMESTAMP, INTERVAL $N)
# but PostgreSQL uses: CURRENT_TIMESTAMP - ($1::text)::interval
# OR simpler: just use timestamp - (interval 'N days')

# Actually the cleanest fix that avoids any escaping issues:
# Replace the INTERVAL 'N days' with 'P0D'::interval and add $1='P0D' as param
# But that changes the SQL structure.

# Simplest: use E'' syntax but properly escaped.
# E'INTERVAL ''3 days''' - the '' inside E'' = single quote
# In JS single-quoted string: '...E\\'INTERVAL \\'\\'3 days\\'\\'\\'...'
# That's unreadable.

# BEST approach: use query with params only.
# CURRENT_TIMESTAMP - $1  where $1 = '3 days'::interval

# Let me just find and replace the specific pattern cleanly.
