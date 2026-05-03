path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
lines = open(path, encoding='utf-8').readlines()

# Check line 302 (0-indexed: 301) - VALUES line
line302 = lines[301]
print("Line 302:", line302)

# Count $N occurrences
import re
dollar_ns = re.findall(r'\$[\d]+', line302)
print("Dollar Ns in line 302:", dollar_ns)
print("Count:", len(dollar_ns))

# Check line 303 - params array
line303 = lines[302]
print("\nLine 303:", line303)
# Count commas to estimate items
comma_count = line303.count(',')
print("Commas:", comma_count, "-> items:", comma_count + 1)

# Also check line 301 - column list
line301 = lines[300]
print("\nLine 301:", line301)
col_count = line301.count(',') + 1  # rough column count
print("Rough columns:", col_count)
