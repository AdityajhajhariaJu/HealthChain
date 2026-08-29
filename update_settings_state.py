with open('src/features/profile/Settings.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const [deleteConfirmation, setDeleteConfirmation] = useState('');" in line:
        lines.insert(i+1, "  const [hapticsEnabled, setHapticsEnabled] = useState(localStorage.getItem('hc_haptics_enabled') !== 'false');\n")
        break

# Now update the haptics_block to use this state
new_lines = []
for line in lines:
    new_line = line
    if "checked={localStorage.getItem('hc_haptics_enabled') !== 'false'}" in line:
        new_line = line.replace("checked={localStorage.getItem('hc_haptics_enabled') !== 'false'}", "checked={hapticsEnabled}")
    if "background: localStorage.getItem('hc_haptics_enabled') !== 'false' ?" in line:
        new_line = line.replace("localStorage.getItem('hc_haptics_enabled') !== 'false'", "hapticsEnabled")
    if "left: localStorage.getItem('hc_haptics_enabled') !== 'false' ?" in line:
        new_line = line.replace("localStorage.getItem('hc_haptics_enabled') !== 'false'", "hapticsEnabled")
    
    if "try { localStorage.setItem('hc_haptics_enabled', 'false'); } catch(e) {}" in line:
        new_line = line + "                  setHapticsEnabled(false);\n"
    if "try { localStorage.removeItem('hc_haptics_enabled'); } catch(e) {}" in line:
        new_line = line + "                  setHapticsEnabled(true);\n"
        
    new_lines.append(new_line)

with open('src/features/profile/Settings.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Added state to Settings for Haptics")
