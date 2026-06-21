import re

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove Start/Stop buttons
html = re.sub(r'<div class="control-group action-buttons">.*?</div>\s*<div class="divider"></div>', '', html, flags=re.DOTALL)

# 2. Extract advanced-features-section to save it from scanner-config-form deletion
adv_match = re.search(r'(<div id="advanced-features-section".*?</div>\s*</div>)', html, re.DOTALL)
adv_html = adv_match.group(1) if adv_match else ""

# 3. Remove scanner-config-form
# wait, the form has a submit button `<div class="form-actions">...</div></form>`
form_match = re.search(r'<form id="scanner-config-form" class="config-form">.*?</form>', html, flags=re.DOTALL)
if form_match:
    # replace the form with just the advanced features
    html = html.replace(form_match.group(0), adv_html)

# 4. Remove simulation-deck
html = re.sub(r'<div class="divider"></div>\s*<!-- Webhook test and status -->\s*<div class="simulation-deck" id="simulation-deck" style="display: none;">.*?</div>', '', html, flags=re.DOTALL)

# 5. Remove console-logs
html = re.sub(r'<!-- Logs view -->\s*<div class="inner-panel console-logs">.*?</div>', '', html, flags=re.DOTALL)

# Add a lock UI for control deck if config was moved?
# Actually user just wants them gone.

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("done")
