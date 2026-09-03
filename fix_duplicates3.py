import os
import re

files = [
    "src/components/ui/FitnessNav.tsx",
    "src/features/dashboard/CaseDashboard.tsx",
    "src/features/dashboard/TrophyCabinet.tsx",
    "src/features/mdt/MDTHub.tsx"
]

for path in files:
    if not os.path.exists(path): continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # FitnessNav
    content = content.replace("border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.8)',\n                transform: 'translateZ(0)'}}", "border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.8)'}}")

    # CaseDashboard
    content = content.replace("transform: 'translateX(-50%)', width: '90px', height: '90px', background: '#A7F3D0', borderRadius: '50%', filter: 'blur(30px)', transform: 'translateZ(0)',", "transform: 'translateX(-50%) translateZ(0)', width: '90px', height: '90px', background: '#A7F3D0', borderRadius: '50%', filter: 'blur(30px)',")

    # TrophyCabinet
    content = content.replace("transform: 'translate(-50%, -50%)', width: '200px', height: '200px', borderRadius: '50%', background: selectedBadge.color, filter: 'blur(80px)', transform: 'translateZ(0)',", "transform: 'translate(-50%, -50%) translateZ(0)', width: '200px', height: '200px', borderRadius: '50%', background: selectedBadge.color, filter: 'blur(80px)',")

    # MDTHub
    content = content.replace("position: 'absolute', willChange: 'transform', top: '-10%',", "position: 'absolute', top: '-10%',")
    content = content.replace("position: 'absolute', willChange: 'transform', bottom: '-10%',", "position: 'absolute', bottom: '-10%',")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

