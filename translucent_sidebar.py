import os
import re

filepath = 'src/index.css'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update .sidebar desktop
old_sidebar = """.sidebar {
  background: #FFFFFF;
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  gap: 12px;
  position: sticky;
  top: 0;
  height: 100vh; height: 100dvh;
  overflow-y: auto;
  border-right: 1px solid var(--border);
}"""

new_sidebar = """.sidebar {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  gap: 12px;
  position: sticky;
  top: 0;
  height: 100vh; height: 100dvh;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  grid-column: 1 / 2;
  grid-row: 1;
  z-index: 10;
}"""
content = content.replace(old_sidebar, new_sidebar)

# 2. Update .app-shell__content desktop
old_content = """.app-shell__content {
  width: 100%;
  flex: 1;
  background: transparent;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}"""

new_content = """.app-shell__content {
  width: 100%;
  flex: 1;
  background: transparent;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  grid-column: 1 / -1;
  grid-row: 1;
  padding-left: 260px;
}"""
content = content.replace(old_content, new_content)

# 3. Reset padding-left on mobile
mobile_query = "@media (max-width: 768px) {"
mobile_index = content.find(mobile_query)
if mobile_index != -1:
    # Find .app-shell__content.mobile or similar inside the media query
    # To be safe, just inject .app-shell__content { padding-left: 0; } right after the query
    insert_str = "\n  .app-shell__content {\n    padding-left: 0;\n  }\n"
    content = content[:mobile_index + len(mobile_query)] + insert_str + content[mobile_index + len(mobile_query):]


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated grid layout for translucent sidebar")
