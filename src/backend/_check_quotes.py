path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')
line154 = lines[153]

# Check if line 154 has balanced quotes
count = line154.count("'")
print(f"Line 154 quote count: {count}")
print(f"Line 154 length: {len(line154)}")
print(f"Is balanced: {count % 2 == 0}")

# Find positions of all single quotes
positions = [i for i, ch in enumerate(line154) if ch == "'"]
print(f"Quote positions: {positions}")

# Show what's between consecutive quotes
for i in range(0, min(10, len(positions)), 2):
    if i+1 < len(positions):
        start = positions[i]
        end = positions[i+1]
        print(f"  Quote {i//2+1}: pos {start}-{end} => {repr(line154[start:end+1])}")
