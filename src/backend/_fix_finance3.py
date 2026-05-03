path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Find createFinance function lines
start_line = None
end_line = None
for i, line in enumerate(lines):
    if 'async function createFinance' in line:
        start_line = i
    if start_line is not None and 'async function' in line and 'createFinance' not in line:
        end_line = i
        break

print(f"createFinance: {start_line+1} to {end_line+1}")

# Print the actual lines with all content
for i in range(start_line, end_line):
    print(f"--- {i+1} ---")
    print(lines[i])
