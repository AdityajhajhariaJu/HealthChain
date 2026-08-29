import os
import re

filepath = 'src/components/layout/AppShell.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

effect_code = """
  // Scroll to top on route change & track page view
  useEffect(() => {
    // Dynamic Theme Color for Android/PWA Status Bar
    const metaThemeColor = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      if (location.pathname.startsWith('/app/ava')) {
        metaThemeColor.setAttribute('content', '#FDE4D3'); // Soft sunset peach
      } else if (location.pathname.startsWith('/app/jarvis')) {
        metaThemeColor.setAttribute('content', '#F1F5F9'); // Slate
      } else {
        metaThemeColor.setAttribute('content', '#F0FDFA'); // Light teal default
      }
    }
"""

content = content.replace("  // Scroll to top on route change & track page view\n  useEffect(() => {", effect_code)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AppShell theme color effect")
