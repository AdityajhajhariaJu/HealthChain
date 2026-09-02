import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Pin to imports
content = re.sub(
    r"import \{([^}]*)\}\s*from\s*'lucide-react'",
    r"import {\1, Pin} from 'lucide-react'",
    content
)

# Add the Pin icon inside the Health Canvas tile
# The tile starts with "{/* The Glassmorphic Arch Canvas Tile */}"
# We'll inject the Pin right before the Brass Pendant Light
new_pin_code = r"""
                  {/* Pushpin */}
                  <div style={{ position: 'absolute', top: '24px', right: '28px', transform: 'rotate(15deg)', zIndex: 10 }}>
                    <Pin size={22} color="#EF4444" strokeWidth={2.5} />
                  </div>
                  
                  {/* Brass Pendant Light */}"""

content = content.replace("{/* Brass Pendant Light */}", new_pin_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Pin injected successfully.")
