import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useEffect for background injection
injection = '''  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.style.background = 'url(/ava-floral-bg.jpg) center/cover no-repeat';
      main.style.backgroundAttachment = 'fixed';
    }
    return () => {
      if (main) {
        main.style.background = '';
        main.style.backgroundAttachment = '';
      }
    };
  }, []);'''

content = content.replace("  const [messages, setMessages] = useState(getSavedMessages());", injection + "\n  const [messages, setMessages] = useState(getSavedMessages());")

# Remove the inline absolute/fixed div
content = re.sub(r'\{/\* Fixed Fullscreen Floral Background \*/\}\n\s*<div style=\{\{ position: \'absolute\'.*?/>\n', '', content)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added DOM background injection")
