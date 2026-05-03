path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()
lines = content.split('\n')

# Show lines 259-265 (0-indexed: 258-264)
for i in range(258, 266):
    print(f"--- {i+1} ---")
    print(repr(lines[i][:200]))
