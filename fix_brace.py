import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """      </div>
      </div>
    </>
  );"""

replacement = """      </div>
      </div>
    </>
  );
}"""

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed closing brace")
else:
    print("Target not found")
