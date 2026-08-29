import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove dead code from ActiveCaseBar
bad_block = '''  const [isScrolling, setIsScrolling] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<any>(null);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
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

# We only want to remove the SECOND occurrence of this (the one in ActiveCaseBar)
# We can do this by splitting and rejoining
parts = content.split(bad_block)
if len(parts) == 3:
    # First split is before AppShell's, second is between, third is after ActiveCaseBar's
    content = parts[0] + bad_block + parts[1] + parts[2]

# Add custom event listener to AppShell
hook_code = '''  useEffect(() => {
    const onCustomScroll = (e: any) => {
      const currentScrollY = e.detail.scrollTop;
      if (currentScrollY < 50) {
        setIsScrolling(false);
        lastScrollY.current = currentScrollY;
        return;
      }
      if (currentScrollY > lastScrollY.current + 12) {
        setIsScrolling(true);
        lastScrollY.current = currentScrollY;
      } else if (currentScrollY < lastScrollY.current - 12) {
        setIsScrolling(false);
        lastScrollY.current = currentScrollY;
      }
    };
    window.addEventListener('hc_scroll_intent', onCustomScroll);
    return () => window.removeEventListener('hc_scroll_intent', onCustomScroll);
  }, []);'''

# insert it after the handleMainScroll definition in AppShell
content = content.replace(bad_block, bad_block + '\n\n' + hook_code, 1)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done AppShell!')
