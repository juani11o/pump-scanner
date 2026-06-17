import re

path = 'c:/Users/jagl_/AntigravityWorkspace/pump-scanner/frontend/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Revert the first hasLedger logic in applyRoleGates()
# The original code was around line 566:
# const hasLedger = isAdmin || !!features.ledger_enabled;
content = re.sub(
    r'const hasLedger = true; // In applyRoleGates context if we can pinpoint',
    r'const hasLedger = isAdmin || !!features.ledger_enabled;',
    content
)
# Actually, let's just do an exact string replace since we only replaced two occurrences of hasLedger = ...
# Wait, I did:
# content = re.sub(r'const hasLedger = isAdmin \|\| !!features\.ledger_enabled;', r'const hasLedger = true;', content)
# content = re.sub(r'const hasLedger = currentUser && \(currentUser\.role === \'admin\' \|\| \(currentUser\.features && currentUser\.features\.ledger_enabled\)\);', r'const hasLedger = true;', content)

# I will just restore them by finding where they are.
# In applyRoleGates:
content = re.sub(
    r'(const features = user\.features \|\| {};.*?)(const hasLedger = true;)',
    r'\1const hasLedger = isAdmin || !!features.ledger_enabled;',
    content,
    flags=re.DOTALL
)

# In navLedger click listener:
content = re.sub(
    r'(navLedger\.addEventListener\(\'click\', \(\) => \{[\s]*)(const hasLedger = true;)',
    r'\1const hasLedger = currentUser && (currentUser.role === \'admin\' || (currentUser.features && currentUser.features.ledger_enabled));',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reverted hasLedger to original logic.")
