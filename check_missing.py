import re

with open('c:/Users/jagl_/AntigravityWorkspace/pump-scanner/frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

keys = set(re.findall(r'data-translate="([^"]+)"', html))
keys.update(re.findall(r'data-translate-placeholder="([^"]+)"', html))

with open('c:/Users/jagl_/AntigravityWorkspace/pump-scanner/frontend/app.js', 'r', encoding='utf-8') as f:
    appjs = f.read()

en_block = re.search(r'en: \{(.*?)\},[\s]*es:', appjs, re.DOTALL)
es_block = re.search(r'es: \{(.*?)\}[\s]*};', appjs, re.DOTALL)

en_keys = set(re.findall(r'([A-Z0-9_]+):', en_block.group(1))) if en_block else set()
es_keys = set(re.findall(r'([A-Z0-9_]+):', es_block.group(1))) if es_block else set()

print("Missing in EN:", sorted(list(keys - en_keys)))
print("Missing in ES:", sorted(list(keys - es_keys)))
