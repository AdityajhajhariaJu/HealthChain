import sys

with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'ImmersiveFeatureFeed' not in content:
    content = content.replace("import { PredictiveTimeline } from '../../components/ui/PredictiveTimeline';", "import { PredictiveTimeline } from '../../components/ui/PredictiveTimeline';\nimport { ImmersiveFeatureFeed } from './ImmersiveFeatureFeed';")

# Inject feed just below PredictiveTimeline
target = "<PredictiveTimeline />"
injection = "<div style={{ padding: '0 24px', marginBottom: '32px' }}><ImmersiveFeatureFeed /></div>"

if target in content and injection not in content:
    content = content.replace(target, target + '\n          ' + injection)

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
