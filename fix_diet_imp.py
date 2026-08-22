import re
with open("src/features/dietician/Dietician.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("import { addEvent, addNutritionLog, getProfileKey } from '../../services/ProfileEngine';", "import { addEvent, addNutritionLog, getProfileKey, getProfile as getCoreProfile, updateProfileFeatureData } from '../../services/ProfileEngine';")

with open("src/features/dietician/Dietician.tsx", "w", encoding="utf-8") as f:
    f.write(content)
