with open('src/services/haptics.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to add an isHapticsEnabled check.
injection = '''export const isHapticsEnabled = () => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('hc_haptics_enabled') !== 'false';
};
'''

content = content.replace("export const triggerHapticLight = async () => {", injection + "\nexport const triggerHapticLight = async () => {\n  if (!isHapticsEnabled()) return;")
content = content.replace("export const triggerHapticMedium = async () => {\n  try {", "export const triggerHapticMedium = async () => {\n  if (!isHapticsEnabled()) return;\n  try {")
content = content.replace("export const triggerHapticSuccess = async () => {\n  try {", "export const triggerHapticSuccess = async () => {\n  if (!isHapticsEnabled()) return;\n  try {")
content = content.replace("export const triggerHapticWarning = async () => {\n  try {", "export const triggerHapticWarning = async () => {\n  if (!isHapticsEnabled()) return;\n  try {")

with open('src/services/haptics.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated haptics.ts to support toggle")
