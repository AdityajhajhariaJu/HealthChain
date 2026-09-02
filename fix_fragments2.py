import sys
import re

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\layout\AppShell.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix showMoreMenu Fragment
pattern = re.compile(r"\{\s*showMoreMenu\s*&&\s*\(\s*<>\s*<motion\.div\s*className=\"mobile-more-menu-backdrop\"", re.DOTALL)
content = pattern.sub(r"""{showMoreMenu && (
                <motion.div
                  key="more-backdrop"
                  className="mobile-more-menu-backdrop\"""", content)

pattern2 = re.compile(r"onClick=\{\(\)\s*=>\s*setShowMoreMenu\(false\)\}\s*/>\s*<motion\.div\s*className=\"mobile-more-menu\"", re.DOTALL)
content = pattern2.sub(r"""onClick={() => setShowMoreMenu(false)}
                />
            )}
            {showMoreMenu && (
                <motion.div
                  key="more-menu"
                  className="mobile-more-menu\"""", content)

pattern3 = re.compile(r"</motion\.div>\s*</>\s*\)\}\s*</AnimatePresence>", re.DOTALL)
content = pattern3.sub(r"""</motion.div>
            )}
          </AnimatePresence>""", content)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace done")
