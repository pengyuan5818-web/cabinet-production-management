path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Replace CASCADE'); with RESTART IDENTITY CASCADE');
old = "CASCADE');"
new = "RESTART IDENTITY CASCADE');"

if old in content:
    content = content.replace(old, new, 1)  # Only first occurrence (the TRUNCATE)
    open(path, 'w', encoding='utf-8').write(content)
    print("Fixed: RESTART IDENTITY added to TRUNCATE")
else:
    print("WARNING: CASCADE'); not found")
    idx = content.find("TRUNCATE TABLE")
    if idx >= 0:
        end = content.find("');", idx)
        print("TRUNCATE section:", repr(content[idx:end+3]))
