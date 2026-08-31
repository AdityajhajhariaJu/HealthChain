import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/components/layout/AppShell.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """
    const enforceSafeArea = () => {
      const div = document.createElement('div');
      div.style.paddingTop = 'env(safe-area-inset-top)';
      document.body.appendChild(div);
      const computedTop = parseInt(getComputedStyle(div).paddingTop, 10) || 0;
      document.body.removeChild(div);
      
      let finalTop = computedTop;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // If on a real mobile device and env() returns 0 (e.g. Android WebView / PWA),
      // we must fallback to 44px to prevent the OS status bar from overlapping the UI.
      // This will not trigger on Desktop browsers resized to mobile width.
      if (isMobileDevice && computedTop === 0) {
        finalTop = 44;
      }
      
      document.documentElement.style.setProperty('--safe-area-top', `${finalTop}px`);
    };
"""

# Replace the existing enforceSafeArea function
# We need to find the exact block.
old_block = """    const enforceSafeArea = () => {
      const div = document.createElement('div');
      div.style.paddingTop = 'env(safe-area-inset-top)';
      document.body.appendChild(div);
      const computedTop = parseInt(getComputedStyle(div).paddingTop, 10) || 0;
      document.body.removeChild(div);
      const finalTop = computedTop;
      document.documentElement.style.setProperty('--safe-area-top', `${finalTop}px`);
    };"""

if old_block in content:
    content = content.replace(old_block, replacement.strip())
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully updated AppShell.tsx safe area logic.")
else:
    print("Could not find the exact old block in AppShell.tsx. Please review.")
