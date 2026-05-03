path = r'C:\Users\Administrator\Desktop\橱柜工厂管理系统\src\backend\full_test_abnormal_v1.js'
content = open(path, encoding='utf-8').read()

# Remove the unhandledRejection handler, restore simple main().catch()
content = content.replace(
    """process.on('unhandledRejection', function(reason, promise) {
    console.error('UNHANDLED REJECTION:', reason && reason.message ? reason.message : reason);
    console.error('Stack:', reason && reason.stack ? reason.stack.split('\\n').slice(0,5).join('\\n') : '(no stack)');
    process.exit(1);
});
main().catch(function(err) { console.error('ERROR:', err.message); console.error('Stack:', err.stack); process.exit(1); });""",
    "main().catch(function(err) { console.error('ERROR:', err.message); process.exit(1); });"
)

open(path, 'w', encoding='utf-8').write(content)
print("Done. Lines:", content.count('\n'))
