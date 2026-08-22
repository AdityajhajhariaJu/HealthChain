import re

with open("src/features/consultation/AvaHealthBuddy.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
content = content.replace("import { getProfileEngineState, getProfileKey } from '../../services/ProfileEngine';", "import { getProfileEngineState, getProfileKey, getProfile, updateProfileFeatureData } from '../../services/ProfileEngine';")

# Update getSavedMessages to migrate
get_msgs = """function getSavedMessages() {
  const profile = getProfile();
  if (profile && profile.avaData) return profile.avaData;
  try {
    const saved = localStorage.getItem(getAvaVaultKey());
    return saved ? JSON.parse(saved) : [INITIAL_MSG];
  } catch {
    return [INITIAL_MSG];
  }
}"""

content = re.sub(r"function getSavedMessages\(\) \{.*?\n\}", get_msgs, content, flags=re.DOTALL)

# Update the useEffect that saves messages
save_effect = """  useEffect(() => {
    try {
      updateProfileFeatureData('avaData', messages);
      localStorage.setItem(getAvaVaultKey(), JSON.stringify(messages));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        const keepCount = Math.floor(messages.length * 0.8);
        const newMsgs = [messages[0], ...messages.slice(messages.length - keepCount)];
        try {
          updateProfileFeatureData('avaData', newMsgs);
          localStorage.setItem(getAvaVaultKey(), JSON.stringify(newMsgs));
        } catch (e2) {}
      }
    }
  }, [messages]);"""

content = re.sub(r"  useEffect\(\(\) => \{\n    try \{\n      localStorage\.setItem\(getAvaVaultKey\(\), JSON\.stringify\(messages\)\);\n    \} catch \(e: any\) \{.*?\n      \}\n    \}\n  \}, \[messages\]\);", save_effect, content, flags=re.DOTALL)

with open("src/features/consultation/AvaHealthBuddy.tsx", "w", encoding="utf-8") as f:
    f.write(content)
