import os

path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'

# We'll build the content in parts and use Python to write
# First, clear the file
with open(path, 'w', encoding='utf-8') as f:
    f.write('')

print('File cleared, ready for incremental write')
print('Next step: write JS content in chunks using Python file I/O')
