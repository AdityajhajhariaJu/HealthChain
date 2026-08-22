import re

with open("src/features/dietician/Dietician.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
content = content.replace("import { getProfileKey, addEvent } from '../../services/ProfileEngine';", "import { getProfileKey, addEvent, getProfile as getCoreProfile, updateProfileFeatureData } from '../../services/ProfileEngine';")
content = content.replace("import { getProfileKey } from '../../services/ProfileEngine';", "import { getProfileKey, getProfile as getCoreProfile, updateProfileFeatureData, addEvent } from '../../services/ProfileEngine';")

with open("src/features/dietician/Dietician.tsx", "w", encoding="utf-8") as f:
    f.write(content)
