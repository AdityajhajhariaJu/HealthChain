import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r"""          </section>
        </div>
  
  
            
      {/\* Articles for You \*/}"""

replacement = """          </section>
        </div>
      </div>
  
  
            
      {/* Articles for You */}"""

content = re.sub(target, replacement, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added missing closing div")
