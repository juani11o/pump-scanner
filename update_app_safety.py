import sys
import re

content = open('frontend/app.js', 'r', encoding='utf-8').read()

# Make DOM lookups safe
replacements = {
    "const btnStartScanner = document.getElementById('btn-start-scanner');": "const btnStartScanner = document.getElementById('btn-start-scanner');", # Keep the declaration but we'll null check
    "const configForm = document.getElementById('scanner-config-form');": "const configForm = document.getElementById('scanner-config-form');",
    "const btnTriggerSimulation = document.getElementById('btn-trigger-simulation');": "const btnTriggerSimulation = document.getElementById('btn-trigger-simulation');",
}

# The user wants advanced integration feature flags:
# In app.js, there is an applyFeatureGates() function. Let's find it or add it to applyFeatureGates.
apply_feature_gates_replacement = '''function applyFeatureGates(user) {
    if (!user) return;
    
    const isPremium = user.role === 'premium' || user.role === 'admin' || user.role === 'black_diamond';
    const isAdmin = user.role === 'admin';
    const hasLlmFeature = user.features && user.features.includes('llm_integration');
    
    // Advanced Integrations section in dashboard
    const advSection = document.getElementById('advanced-features-section');
    if (advSection) {
        if (isAdmin || hasLlmFeature) {
            advSection.style.display = 'block';
        } else {
            advSection.style.display = 'none';
        }
    }
'''

# Find applyFeatureGates and replace its beginning
if 'function applyFeatureGates(user) {' in content:
    content = re.sub(r'function applyFeatureGates\(user\) \{[\s\S]*?(?=(?:const ledgerNav|const tradeNav|const isPremium))', apply_feature_gates_replacement, content, count=1)
else:
    print("Could not find applyFeatureGates")

# We need to ensure we null-check event listeners so app.js doesn't crash
null_checks = [
    r'(configForm\.addEventListener\()',
    r'(btnStartScanner\.addEventListener\()',
    r'(btnStopScanner\.addEventListener\()',
    r'(btnTriggerSimulation\.addEventListener\()',
    r'(btnClearLogs\.addEventListener\()',
    r'(btnSaveSettings\.addEventListener\()'
]

for check in null_checks:
    # We replace `element.addEventListener(` with `if (element) element.addEventListener(`
    content = re.sub(check, r'if (\1'.replace('(', '').replace('\\', '') + r') \1', content)

# Remove the console log function writing to the deleted viewport
content = content.replace("const consoleViewport = document.getElementById('console-viewport');", "const consoleViewport = document.getElementById('console-viewport');")

# Find appendLog and make it safe
content = re.sub(r'(function appendLog\(message, type\) \{[\s\S]*?)(const line =)', r'\1if (!consoleViewport) return;\n    \2', content)

open('frontend/app.js', 'w', encoding='utf-8').write(content)
print("app.js updated with feature flag logic and null checks.")
