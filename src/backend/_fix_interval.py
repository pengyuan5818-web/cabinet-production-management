path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Fix INTERVAL 'N days' inside single-quoted JS strings
# Replace with PostgreSQL E'' syntax: E'INTERVAL \'N days\''
content = content.replace("INTERVAL '3 days'", "E'INTERVAL \\'3 days\\''")
content = content.replace("INTERVAL '2 days'", "E'INTERVAL \\'2 days\\''")
content = content.replace("INTERVAL '5 days'", "E'INTERVAL \\'5 days\\''")
content = content.replace("INTERVAL '4 days'", "E'INTERVAL \\'4 days\\''")
content = content.replace("INTERVAL '1 day'", "E'INTERVAL \\'1 day\\''")

open(path, 'w', encoding='utf-8').write(content)
print('Done')
print('Size:', len(content))
