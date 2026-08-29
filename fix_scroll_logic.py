import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_scroll = '''  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > 50 && currentScrollY > lastScrollY.current + 10) {
      setIsScrolling(true);
    } else if (currentScrollY < lastScrollY.current - 10) {
      setIsScrolling(false);
    }
    lastScrollY.current = currentScrollY;

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 200);
  };'''

new_scroll = '''  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    // Always show if at the very top
    if (currentScrollY < 50) {
      setIsScrolling(false);
      lastScrollY.current = currentScrollY;
      return;
    }

    // Hide on scroll down, show on scroll up
    if (currentScrollY > lastScrollY.current + 12) {
      setIsScrolling(true);
      lastScrollY.current = currentScrollY;
    } else if (currentScrollY < lastScrollY.current - 12) {
      setIsScrolling(false);
      lastScrollY.current = currentScrollY;
    }
  };'''

content = content.replace(old_scroll, new_scroll)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
