import os
import re

files = [
    "src/components/ui/CompilingAnimation.tsx",
    "src/components/ui/LongevityBioStackCard.tsx",
    "src/components/ui/PredictiveTimeline.tsx",
    "src/features/dietician/DieticianComponents.tsx",
    "src/features/mdt/MDTComponents.tsx"
]

for path in files:
    if not os.path.exists(path):
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Generic replace for typical progress bars
    content = content.replace("animate={{ width: `${progress}%` }}", "animate={{ scaleX: progress / 100 }}")
    content = content.replace("animate={{ width: `${hydrationPercent}%` }}", "animate={{ scaleX: hydrationPercent / 100 }}")
    content = content.replace("animate={{ width: `${(timeIndex / 2) * 100}%`", "animate={{ scaleX: timeIndex / 2")
    content = content.replace("animate={{ width: `${(step / 8) * 100}%` }}", "animate={{ scaleX: step / 8 }}")
    content = content.replace("animate={{ width: status === 'done' ? '100%' : `${(questionCount / 8) * 100}%` }}", "animate={{ scaleX: status === 'done' ? 1 : questionCount / 8 }}")

    # Add transformOrigin: left
    content = content.replace("style={{ height: '100%', background: '#3B82F6', borderRadius: '4px' }}", "style={{ height: '100%', background: '#3B82F6', borderRadius: '4px', transformOrigin: 'left' }}")
    content = content.replace("style={{ height: '100%', background: '#10B981', borderRadius: '999px' }}", "style={{ height: '100%', background: '#10B981', borderRadius: '999px', transformOrigin: 'left' }}")
    content = content.replace("style={{ height: '100%', background: specialist.color }}", "style={{ height: '100%', width: '100%', background: specialist.color, transformOrigin: 'left' }}")
    content = content.replace("style={{ height: '100%', background: 'var(--orange)' }}", "style={{ height: '100%', width: '100%', background: 'var(--orange)', transformOrigin: 'left' }}")
    content = content.replace("style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y',  position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: '2px', zIndex: 1 }}", "style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y', position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, transformOrigin: 'left', borderRadius: '2px', zIndex: 1 }}")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

