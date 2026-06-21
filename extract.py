import re

with open('frontend/index_ceed42e.html', 'r', encoding='utf-16') as f:
    content = f.read()

m = re.search(r'(<section class="telemetry-deck">.*?</section>)', content, re.DOTALL)
if m:
    with open('extracted_telemetry.html', 'w', encoding='utf-8') as f:
        f.write(m.group(1))
    print("Extracted telemetry deck.")
