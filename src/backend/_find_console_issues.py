path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()

# Find all console.log lines that have duplicate "'" pattern
for i, l in enumerate(lines):
    stripped = l.strip()
    # Pattern: console.log('...');');
    if stripped.startswith("console.log('"):
        # Check if there's a duplicate closing
        if "');" in stripped and stripped.count("'");") > 1:
            print(f'Line {i+1}: DUPLICATE: {repr(l)}')
        elif stripped.count("'");") > 1:
            print(f'Line {i+1}: DOUBLE );: {repr(l)}')
    # Also find lines starting with '=== (header-style lines that should be merged)
    if stripped.startswith("'===") or stripped.startswith("'--------"):
        print(f'Line {i+1}: ORPHAN HEADER: {repr(l)}')

print('Scan done')
