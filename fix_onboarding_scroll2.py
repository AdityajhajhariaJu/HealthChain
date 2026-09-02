import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\onboarding\OnboardingFlow.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target_step0 = """style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}"""
replacement_step0 = """style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 'min-content', padding: '24px 0' }}"""

content = content.replace(target_step0, replacement_step0)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated OnboardingFlow step 0 scrolling")
