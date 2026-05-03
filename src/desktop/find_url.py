content = open(r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\desktop\main.js', encoding='utf-8').read()
import re
for m in re.finditer(r'["\'](https?://[^"\']+)["\']', content):
    print(m.group(1))
