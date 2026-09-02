import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\profile\MedicalProfile.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_statement = "import { awardPoints } from '../../services/VitalityPointsEngine';\n"
if "awardPoints" not in content:
    content = content.replace("import { getProfile, updateDemographics", import_statement + "import { getProfile, updateDemographics")

# Update handleSaveDemographics
old_handler = """  const handleSaveDemographics = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateDemographics(demoForm);
      setIsSaving(false);
      setIsEditingDemo(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }, 500); // Simulate network latency for the saving indicator
  };"""

new_handler = """  const handleSaveDemographics = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateDemographics(demoForm);
      
      const isComplete = demoForm.dob && demoForm.gender && demoForm.bloodGroup;
      if (isComplete) {
        awardPoints(10, 'Health Profile Completed', 'platform', 'profile_completion');
      }

      setIsSaving(false);
      setIsEditingDemo(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }, 500); // Simulate network latency for the saving indicator
  };"""

content = content.replace(old_handler, new_handler)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MedicalProfile gamification")
