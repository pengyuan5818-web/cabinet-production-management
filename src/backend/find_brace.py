filepath = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'
with open(filepath, 'rb') as f:
    data = f.read()

text = data.decode('utf-8')
lines = text.split('\n')

# Track curly brace balance per line
balance = 0
for i, line in enumerate(lines):
    # Remove string literals for accurate counting
    stripped = line
    # Simple: count only outside of strings
    in_str = False
    str_char = None
    for j, ch in enumerate(stripped):
        if not in_str and ch in ("'", '"', '`'):
            in_str = True
            str_char = ch
        elif in_str and ch == str_char and (j == 0 or stripped[j-1] != '\\'):
            in_str = False
            str_char = None
        elif not in_str:
            if ch == '{': balance += 1
            elif ch == '}': balance -= 1
    
    if balance < 0:
        print(f'Line {i+1}: balance={balance} (negative!) -> {line.strip()[:60]}')
    
    if i >= 610:  # From summary route onwards
        print(f'Line {i+1}: balance={balance} -> {line.strip()[:70]}')

print(f'\nFinal balance: {balance}')
