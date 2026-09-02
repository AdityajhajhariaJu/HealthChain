import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\geminiService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

find_code = """  const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);"""

replace_code = """  let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const startIdx = cleanJson.indexOf('{');
  const endIdx = cleanJson.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1) {
    cleanJson = cleanJson.substring(startIdx, endIdx + 1);
  }
  return JSON.parse(cleanJson);"""

content = content.replace(find_code, replace_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Made JSON robust")
