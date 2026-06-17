import re

path = 'c:/Users/jagl_/AntigravityWorkspace/pump-scanner/frontend/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add DASHBOARD and ADVANCED_FEATURES to translations.en
content = re.sub(
    r'(en: \{\s*SYSTEM_STATUS: "SYSTEM_STATUS",)',
    r'\1\n            DASHBOARD: "DASHBOARD",\n            ADVANCED_FEATURES: "ADVANCED FEATURES",',
    content
)

# 2. Add DASHBOARD and ADVANCED_FEATURES to translations.es
content = re.sub(
    r'(es: \{\s*SYSTEM_STATUS: "ESTADO_SISTEMA",)',
    r'\1\n            DASHBOARD: "PANEL DE CONTROL",\n            ADVANCED_FEATURES: "CARACTERÍSTICAS AVANZADAS",',
    content
)

# 3. Make My Trades available - remove the lock from the span and always allow access
content = re.sub(
    r'const hasLedger = isAdmin \|\| !!features\.ledger_enabled;',
    r'const hasLedger = true;',
    content
)

content = re.sub(
    r'const hasLedger = currentUser && \(currentUser\.role === \'admin\' \|\| \(currentUser\.features && currentUser\.features\.ledger_enabled\)\);',
    r'const hasLedger = true;',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modifications done.")
