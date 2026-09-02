import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\AmbientGyroBackground.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make background creme
content = content.replace(
    "background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',",
    "background: '#FBF9F6',"
)

# Replace the green orb with a subtle warm/creme orb
content = content.replace(
    "background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, rgba(13,148,136,0) 70%)',",
    "background: 'radial-gradient(circle, rgba(230,220,200,0.4) 0%, rgba(230,220,200,0) 70%)',"
)

# Replace the blue orb with a subtle white orb
content = content.replace(
    "background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, rgba(14,165,233,0) 70%)',",
    "background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)',"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AmbientGyroBackground to creme")
