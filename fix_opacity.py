import os
import glob

search_text = "linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.1) 100%)"
replace_text = "linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)"

for root, _, files in os.walk(r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            if search_text in content:
                content = content.replace(search_text, replace_text)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated opacity in {file}")
