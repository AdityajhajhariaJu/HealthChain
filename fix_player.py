import sys

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/ui/MeditationPlayer.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

text_to_insert = """
                    {/* Content Info */}
                    <div style={{ marginBottom: "32px", textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                      <h3 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700, color: "white", letterSpacing: "-0.5px" }}>
                        {content.title}
                      </h3>
                      {content.description && (
                        <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.85)", lineHeight: 1.5, maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
                          {content.description}
                        </p>
                      )}
                    </div>

"""

content = content.replace("                    {/* Media Buttons */}", text_to_insert + "                    {/* Media Buttons */}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated MeditationPlayer to show description.')
