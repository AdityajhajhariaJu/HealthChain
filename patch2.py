import sys

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the stray closing brace
bad_closing = '''        </div>
      )}

      {/* Articles for You */}'''

good_closing = '''        </div>

      {/* Articles for You */}'''

content = content.replace(bad_closing, good_closing)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed closing brace')
