import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ArrowLeft import
content = content.replace("  Quote,", "  ArrowLeft,\n  Quote,")

# Remove the condition hiding mobile-top-bar and add the back button
old_bar = '''          <>
            {!location.pathname.startsWith('/app/ava') && (
              <div className="mobile-top-bar">
              <div style={{ position: 'relative' }}>
                <img 
                  src={https://ui-avatars.com/api/?name=&background=0F8B7E&color=fff}
                  alt="Profile" 
                  className="mobile-top-bar__profile" 
                  onClick={() => {
                    triggerHapticLight();
                    setShowProfileMenu(!showProfileMenu);
                  }} 
                />
                <div className={status-indicator } />
              </div>'''

new_bar = '''          <>
              <div className="mobile-top-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {location.pathname.startsWith('/app/ava') && (
                  <button
                    onClick={() => navigate(-1)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(244, 63, 94, 0.15)',
                      color: '#F43F5E',
                    }}
                    aria-label="Go back"
                  >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                  </button>
                )}
                <div style={{ position: 'relative' }}>
                  <img 
                    src={https://ui-avatars.com/api/?name=&background=0F8B7E&color=fff}
                    alt="Profile" 
                    className="mobile-top-bar__profile" 
                    onClick={() => {
                      triggerHapticLight();
                      setShowProfileMenu(!showProfileMenu);
                    }} 
                  />
                  <div className={status-indicator } />
                </div>
              </div>'''

content = content.replace(old_bar, new_bar)

# Fix the closing brace for the removed condition
old_close = '''              </div>
          </div>
            )}
          {!location.pathname.startsWith('/app/ava') && (
          <nav className={mobile-tab-bar }>'''

new_close = '''              </div>
          </div>
          {!location.pathname.startsWith('/app/ava') && (
          <nav className={mobile-tab-bar }>'''

content = content.replace(old_close, new_close)

# Remove the paddingTop reset on main-content so the header doesn't overlap
old_main = "paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined"
new_main = "paddingTop: undefined"
content = content.replace(old_main, new_main)


with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AppShell mobile-top-bar")
