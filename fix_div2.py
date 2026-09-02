import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """          </section>
        </div>
  
  
            
      {/* Articles for You */}"""

replacement = """          </section>
        </div>
        </div>
  
  
            
      {/* Articles for You */}"""

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed closing div")
else:
    print("Target still not found")
