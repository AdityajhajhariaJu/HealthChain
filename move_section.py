import sys
import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract STEP 4: SPECIALTY & GAMING section
pattern = r"(\s*{/\* STEP 4: SPECIALTY & GAMING \*/}.*?</section>\s*)\n\s*{/\* Our Own Meditation Hub"

match = re.search(pattern, content, re.DOTALL)
if match:
    specialty_section = match.group(1)
    
    # 2. Remove the section from its original location
    # Note: re.sub with exact string match is safer with content.replace
    content = content.replace(specialty_section, "")
    
    # 3. Find target location: just before "      {/* Articles for You */}"
    target = "      {/* Articles for You */}"
    
    # Insert it
    content = content.replace(target, specialty_section + "\n" + target)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully moved 'Specialty & Gaming' above 'Articles for You'")
else:
    print("Could not find the 'Specialty & Gaming' section using the regex.")

