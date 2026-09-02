import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

def check_usage(word):
    return content.count(word) > 1

for word in ['ImmersiveFeatureFeed', 'getProfile', 'ClinicalFrictionModal']:
    print(f"{word}: {check_usage(word)}")
