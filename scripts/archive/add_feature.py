import re

with open("src/services/ProfileEngine.js", "r", encoding="utf-8") as f:
    content = f.read()

func = """export function updateProfileFeatureData(featureKey, data) {
  const profile = getProfile();
  if (!profile) return;
  profile[featureKey] = data;
  saveProfile(profile);
}
"""

if "updateProfileFeatureData" not in content:
    content = content.replace("export function updateDemographics", func + "\nexport function updateDemographics")

with open("src/services/ProfileEngine.js", "w", encoding="utf-8") as f:
    f.write(content)
