import os

search_patterns = ['backup', 'bak', 'orig', 'auth.js', 'auth_backup']
onedrive = r'C:\Users\Administrator\OneDrive'
results = []

for root, dirs, files in os.walk(onedrive):
    if 'node_modules' in root or '.git' in root:
        continue
    for f in files:
        fname_lower = f.lower()
        if any(p in fname_lower for p in search_patterns):
            full = os.path.join(root, f)
            results.append(full)
            if len(results) >= 30:
                break
    if len(results) >= 30:
        break

print('\n'.join(results) if results else 'None found')
