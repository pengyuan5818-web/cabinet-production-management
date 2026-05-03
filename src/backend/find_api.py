import re, os

# Check frontend API base URL config
fpath = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web\src\api\index.js'
if os.path.exists(fpath):
    content = open(fpath, encoding='utf-8').read()
    for kw in ['baseURL', 'base_url', 'BASE_URL', 'axios.defaults', 'fenier', 'cpolar', '17.tcp', '11873']:
        idx = content.find(kw)
        if idx >= 0:
            print(f'Found [{kw}] at {idx}:')
            print(content[max(0,idx-30):idx+150])
            print('---')

# Also check vue.config.js or .env files
for fname in ['vue.config.js', '.env', '.env.production', 'js/config.js']:
    for root in [
        r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\frontend\web',
        r'C:\Users\Administrator\Desktop\橱柜工厂管理系统',
    ]:
        fpath2 = os.path.join(root, fname)
        if os.path.exists(fpath2):
            content2 = open(fpath2, encoding='utf-8', errors='ignore').read()
            for kw in ['fenier', 'cpolar', 'API', 'BASE_URL', 'VITE_']:
                if kw in content2:
                    print(f'\n[{fname}] in {root} has [{kw}]:')
                    for line in content2.split('\n'):
                        if kw in line:
                            print(f'  {line.strip()}')
