import sys

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# For War Room hero card
content = content.replace("borderRadius: '160px 160px 32px 32px', \n                    position: 'relative',", 
"borderRadius: '160px 160px 32px 32px', \n                    border: '1px solid rgba(255, 255, 255, 0.8)', \n                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.05), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.3)', \n                    position: 'relative',")

# For AR Lens card
content = content.replace("borderRadius: '32px',\n                    padding: '20px',",
"borderRadius: '32px',\n                    border: '1px solid rgba(255, 255, 255, 0.8)', \n                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.05), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.3)', \n                    padding: '20px',")

# For Tasks card
content = content.replace("borderRadius: '32px',\n                    padding: '20px',\n                    display: 'flex',",
"borderRadius: '32px',\n                    border: '1px solid rgba(255, 255, 255, 0.8)', \n                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.05), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.3)', \n                    padding: '20px',\n                    display: 'flex',")

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added specular highlights to all remaining dashboard cards")
