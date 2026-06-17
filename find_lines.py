with open('c:/Users/jagl_/AntigravityWorkspace/pump-scanner/frontend/style.css', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'journal-panel' in line or 'compound-interest-grid' in line or 'journal-layout' in line:
            print(f"{i}: {line.strip()}")
