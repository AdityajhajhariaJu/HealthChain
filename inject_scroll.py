import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

state_injection = '''  const [profile, setProfile] = useState(getProfile());
  const [isScrolling, setIsScrolling] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<any>(null);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
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
    }, 1500);
  };
'''

content = content.replace('  const [profile, setProfile] = useState(getProfile());', state_injection)

content = content.replace(
'''<main className={pp-shell__content } id="main-content">''',
'''<main className={pp-shell__content } id="main-content" onScroll={handleMainScroll}>'''
)

content = content.replace(
'''<nav className="mobile-tab-bar">''',
'''<nav className={mobile-tab-bar }>'''
)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done AppShell!')
