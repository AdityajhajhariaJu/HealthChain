import os
files = ["src/components/ui/AmbientGyroBackground.tsx", "src/components/ui/FitnessNav.tsx", "src/features/dashboard/CaseDashboard.tsx", "src/features/dashboard/TrophyCabinet.tsx", "src/features/mdt/MDTHub.tsx"]
for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    
    lines = content.split("\n")
    for i in range(len(lines)):
        # Just brute-force known duplicated patterns
        lines[i] = lines[i].replace("willChange: 'transform', transform: 'translateZ(0)', willChange: 'transform'", "transform: 'translateZ(0)', willChange: 'transform'")
        lines[i] = lines[i].replace("transform: 'translateZ(0)', willChange: 'transform', transform: 'translateZ(0)'", "transform: 'translateZ(0)', willChange: 'transform'")
        lines[i] = lines[i].replace("willChange: 'transform', willChange: 'transform'", "willChange: 'transform'")
        lines[i] = lines[i].replace("transform: 'translateZ(0)', transform: 'translateZ(0)'", "transform: 'translateZ(0)'")
        # specific for fitnessNav
        lines[i] = lines[i].replace("transform: 'translateZ(0)', willChange: 'transform', transform: 'translateY", "willChange: 'transform', transform: 'translateY")
    
    with open(f, "w", encoding="utf-8") as file:
        file.write("\n".join(lines))

