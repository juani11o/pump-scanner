import re

with open('c:/Users/jagl_/AntigravityWorkspace/pump-scanner/frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

keys = set(re.findall(r'data-translate="([^"]+)"', content))
keys.update(re.findall(r'data-translate-placeholder="([^"]+)"', content))

print(sorted(list(keys)))
