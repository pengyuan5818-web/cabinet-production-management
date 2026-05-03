import sys

filepath = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\warehouse.js'
with open(filepath, 'rb') as f:
    data = f.read()

text = data.decode('utf-8')
lines = text.split('\n')
print(f'Lines: {len(lines)}, Bytes: {len(data)}')

# Count braces, parens, brackets
open_curly = text.count('{')
close_curly = text.count('}')
open_paren = text.count('(')
close_paren = text.count(')')
open_bracket = text.count('[')
close_bracket = text.count(']')

print(f'Curly: {{ {open_curly} }} {close_curly} (diff: {open_curly - close_curly})')
print(f'Paren: ( {open_paren} ) {close_paren} (diff: {open_paren - close_paren})')
print(f'Bracket: [ {open_bracket} ] {close_bracket} (diff: {open_bracket - close_bracket})')

# Find template literals - look for backticks
backticks = text.count('`')
print(f'Backticks: {backticks}')

# Check for unterminated strings (lines ending with comma/operators)
problem_lines = []
for i, line in enumerate(lines):
    stripped = line.rstrip()
    if stripped and stripped[-1] in (',', '+', '|', '&') and not stripped.startswith('//'):
        problem_lines.append((i+1, stripped[:60]))

if problem_lines:
    print(f'\nPotentially unterminated lines:')
    for ln, content in problem_lines[-10:]:
        print(f'  {ln}: {content}')
else:
    print('\nNo obvious unterminated line issues')
