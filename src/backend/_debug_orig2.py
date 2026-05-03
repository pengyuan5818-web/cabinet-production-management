path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()

# Show context around each broken line
broken = [573, 621, 680, 732, 779, 874]
for ln in broken:
    i = ln - 1
    print(f'--- Line {ln} (chars {sum(len(l) for l in lines[:i])}, len={len(lines[i])}): ---')
    # show hex of last 30 chars
    line = lines[i].rstrip('\n')
    print('Last 30 chars hex:', line[-30:].encode('utf-8').hex())
    print('Content:', repr(lines[i]))
    # Show prev line too
    if i > 0:
        print('Prev:', repr(lines[i-1]))
