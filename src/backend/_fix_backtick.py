path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Replace backtick-wrapped values with escaped single-quotes for PostgreSQL
# In JS string: `xxx` -> ''xxx'' (doubled single quotes, PostgreSQL string escape)
# This avoids backtick being interpreted by PostgreSQL
def fix_backtick(s):
    # Find all backtick-wrapped content and replace backtick with doubled single quote
    result = []
    i = 0
    while i < len(s):
        if s[i] == '`':
            # Find matching closing backtick
            j = i + 1
            while j < len(s) and s[j] != '`':
                j += 1
            if j < len(s):
                inner = s[i+1:j]
                # Escape any single quotes in inner by doubling them
                inner_escaped = inner.replace("'", "''")
                result.append("'" + inner_escaped + "'")
                i = j + 1
            else:
                result.append(s[i])
                i += 1
        else:
            result.append(s[i])
            i += 1
    return ''.join(result)

content2 = fix_backtick(content)
open(path, 'w', encoding='utf-8').write(content2)
print('Done')
print('Size:', len(content2), 'bytes')
print('Lines:', content2.count('\n'))
