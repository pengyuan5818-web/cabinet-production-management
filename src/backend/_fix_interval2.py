path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# The problem: INTERVAL 'N days' in a JS single-quoted string causes JS to terminate string early.
# Fix: Replace with E'INTERVAL ''N days'' in JS (PostgreSQL E'' escape string syntax).
# In Python, to produce E'INTERVAL ''N days'' in the file:
#   - The file content after Python writes: E'INTERVAL ''3 days''
#   - In JS, E'INTERVAL ''3 days'' parses as:
#     E'INTERVAL ' (valid, E'...' string literal)
#     ' (starts new string)  
#     3 days (invalid)
# Actually PostgreSQL E'' uses '' for escaped quotes, not \'.
# The file should contain E'INTERVAL ''3 days'' (4 single quotes total)

# Replace current broken form E'INTERVAL \'3 days\'' with correct E'INTERVAL ''3 days''
# First undo the bad fix
content = content.replace("E'INTERVAL \\'3 days\\''", "E'INTERVAL ''3 days''")
content = content.replace("E'INTERVAL \\'2 days\\''", "E'INTERVAL ''2 days''")
content = content.replace("E'INTERVAL \\'5 days\\''", "E'INTERVAL ''5 days''")
content = content.replace("E'INTERVAL \\'4 days\\''", "E'INTERVAL ''4 days''")
content = content.replace("E'INTERVAL \\'1 day\\''", "E'INTERVAL ''1 day''")

open(path, 'w', encoding='utf-8').write(content)
print('Done')
print('Size:', len(content))

# Verify
lines = content.split('\n')
line154 = lines[153]
print('Line 154 length:', len(line154))
print('E INTERVAL area:', repr(line154[400:430]))
