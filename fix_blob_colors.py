import sys

# 1. Update ConsultPage.tsx to use cleaner, brighter pastels
consult_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\consultation\ConsultPage.tsx'
with open(consult_path, 'r', encoding='utf-8') as f:
    consult = f.read()

consult = consult.replace("#FFEDD5", "#FFE4E6") # Orange -> Soft Rose
consult = consult.replace("#FEE2E2", "#E0F2FE") # Red -> Soft Sky Blue
consult = consult.replace("#FEF3C7", "#FEF3C7") # Amber remains Amber
consult = consult.replace("#ECFCCB", "#D1FAE5") # Lime -> Soft Mint

with open(consult_path, 'w', encoding='utf-8') as f:
    f.write(consult)


# 2. Update CaseDashboard.tsx to use only ultra-light, glowing pastels so they don't look like dark smudges
dash_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(dash_path, 'r', encoding='utf-8') as f:
    dash = f.read()

dash = dash.replace("#5EEAD4", "#99F6E4") # Teal 300 -> Teal 200
dash = dash.replace("#FDBA74", "#FDE68A") # Amber 300 -> Yellow 200
dash = dash.replace("#E7E5E4", "#FFEDD5") # Stone 200 -> Orange 100 (warm glow)
dash = dash.replace("#94A3B8", "#BAE6FD") # Slate 400 -> Sky 200
dash = dash.replace("#D8B4FE", "#E9D5FF") # Purple 300 -> Purple 200
dash = dash.replace("#2DD4BF", "#A7F3D0") # Teal 400 -> Emerald 200
dash = dash.replace("#CBD5E1", "#E2E8F0") # Slate 300 -> Slate 200

with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash)

print("Lightened all background blobs to eliminate dark smudges")
