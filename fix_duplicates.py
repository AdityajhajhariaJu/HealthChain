import os, re
files = ["src/components/ui/AmbientGyroBackground.tsx", "src/components/ui/FitnessNav.tsx", "src/features/dashboard/CaseDashboard.tsx", "src/features/dashboard/TrophyCabinet.tsx", "src/features/mdt/MDTHub.tsx"]
for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    # Replace duplicate willChange: 'transform'
    content = re.sub(r"(willChange:\s*'transform',\s*)+", "willChange: 'transform', ", content)
    content = re.sub(r"(transform:\s*'translateZ\(0\)',\s*)+", "transform: 'translateZ(0)', ", content)
    with open(f, "w", encoding="utf-8") as file:
        file.write(content)

