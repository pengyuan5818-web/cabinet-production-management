path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

old_end = 'main().catch(function(err) { console.error("ERROR:", err.message); process.exit(1); });'
new_end = '''process.on('unhandledRejection', function(reason, promise) {
    console.error('UNHANDLED REJECTION:', reason && reason.message ? reason.message : reason);
    console.error('Stack:', reason && reason.stack ? reason.stack.split('\\n').slice(0,5).join('\\n') : '(no stack)');
    process.exit(1);
});
main().catch(function(err) { console.error('ERROR:', err.message); console.error('Stack:', err.stack); process.exit(1); });'''

if old_end in content:
    content = content.replace(old_end, new_end)
    open(path, 'w', encoding='utf-8').write(content)
    print("Done")
else:
    print("WARNING: old_end not found")
    # Find main call
    idx = content.find('main().catch')
    if idx >= 0:
        print("Found at idx", idx, ":", repr(content[idx:idx+100]))
