with open('src/features/profile/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    
# Print out all the h3 headers or section titles to understand layout
import re
titles = re.findall(r'<h[234].*?>(.*?)</h[234]>', content)
print("Headers:", titles)
