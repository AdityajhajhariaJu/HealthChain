import re

file_path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\profile\MedicalProfile.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Find the start of insights content
insights_start_marker = '<div className={activeTab !== "insights" ? "tab-content-hidden" : ""} style={{ display: activeTab === "insights" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>'
insights_start_idx = text.find(insights_start_marker)

care_team_marker = '{/* NEW: Care Team & Document Vault */}'
care_team_idx = text.find(care_team_marker, insights_start_idx)

# Extract the synthesis block
synthesis_block = text[insights_start_idx + len(insights_start_marker) : care_team_idx]

# Create the new shared wrapper
shared_wrapper = f'''<div className={{(activeTab !== "overview" && activeTab !== "insights") ? "tab-content-hidden" : ""}} style={{{{ display: (activeTab === "overview" || activeTab === "insights") ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}}}>
{synthesis_block}</div>
'''

# Remove synthesis block from insights wrapper
new_insights_wrapper = insights_start_marker + '\n' + text[care_team_idx:]

# The overview wrapper is before records wrapper
overview_marker = '<div className={activeTab !== "overview" ? "tab-content-hidden" : ""} style={{ display: activeTab === "overview" ? "flex" : "none", flexDirection: "column", gap: "24px", gridColumn: "1 / -1" }}>'

# We will place the shared wrapper right BEFORE the overview wrapper, so it shows up at the top of the Overview and Insights tabs!
text = text[:insights_start_idx] + new_insights_wrapper

overview_idx = text.find(overview_marker)
text = text[:overview_idx] + shared_wrapper + text[overview_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Success')
