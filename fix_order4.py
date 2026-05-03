f = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\src\routes\order.js'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Remove duplicate module.exports
old = "\nmodule.exports = router;\n\nmodule.exports = router;"
new = "\nmodule.exports = router;"

if old in c:
    c = c.replace(old, new)
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(c)
    print('done')
else:
    print('not found')
    # try alternate
    old2 = "module.exports = router;\n\nmodule.exports = router;"
    if old2 in c:
        c = c.replace(old2, "module.exports = router;")
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(c)
        print('done2')
    else:
        print('not found either')
        idx = c.find("module.exports")
        print("module.exports at:", idx)
