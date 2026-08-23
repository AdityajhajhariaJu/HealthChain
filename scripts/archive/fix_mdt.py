import re
with open("src/features/mdt/MDTHub.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("activeCase?.data?.reviews", "(activeCase as any)?.data?.reviews")
content = content.replace("activeCase.data.reviews", "(activeCase as any).data.reviews")

with open("src/features/mdt/MDTHub.tsx", "w", encoding="utf-8") as f:
    f.write(content)
