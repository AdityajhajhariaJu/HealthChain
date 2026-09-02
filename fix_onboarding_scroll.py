import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\onboarding\OnboardingFlow.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the inner container scrollable
target = """<div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '32px' }}>"""
replacement = """<div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '32px', overflowY: 'auto' }}>"""

content = content.replace(target, replacement)

# Add minHeight to ensure content can expand and scroll naturally
target_motion = """style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}"""
replacement_motion = """style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 'min-content' }}"""

content = content.replace(target_motion, replacement_motion)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated OnboardingFlow scrolling")
