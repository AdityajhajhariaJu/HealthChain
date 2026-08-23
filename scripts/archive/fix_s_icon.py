with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the map block to use uppercase Icon
old_block = """            {selectedSpecialists.map((s, i) => (
              <div
                key={s.id}"""

new_block = """            {selectedSpecialists.map((s, i) => {
              const Icon = s.icon;
              return (
              <div
                key={s.id}"""

content = content.replace(old_block, new_block)
content = content.replace("<s.icon size={20} />", "<Icon size={20} />")

# Close the return and bracket for the map
end_block = """                  />
                </div>
              </div>
            ))}"""

new_end_block = """                  />
                </div>
              </div>
            );
            })}"""

content = content.replace(end_block, new_end_block)

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
