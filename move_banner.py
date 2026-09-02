import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\layout\AppShell.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

find_str = """          <GuestStickyBanner />
          {/* Hardware-accelerated structural wrapper to force standard document flow and prevent flex-overlap bugs */}"""

replace_str = """          {/* Hardware-accelerated structural wrapper to force standard document flow and prevent flex-overlap bugs */}"""

content = content.replace(find_str, replace_str)

# Now put it outside motion.main, perhaps right after </motion.main>
find_end = """        </motion.main>

        <BottomNav />
      </div>"""

replace_end = """        </motion.main>
        
        <GuestStickyBanner />

        <BottomNav />
      </div>"""

content = content.replace(find_end, replace_end)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Moved GuestStickyBanner out of motion.main")
