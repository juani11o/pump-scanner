import re

path = 'c:/Users/jagl_/AntigravityWorkspace/pump-scanner/frontend/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r"\'admin\'", "'admin'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed syntax error in app.js")
