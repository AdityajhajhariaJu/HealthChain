with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if '{isMobile && (' in line:
        # We know the next lines are:
        # <>
        #   {!location.pathname.startsWith('/app/ava') && (
        #     <div className="mobile-top-bar">
        #     <div style={{ position: 'relative' }}>
        new_lines.append(line)
        continue
        
    if "<>" in line and "{isMobile && (" in lines[i-1]:
        new_lines.append(line)
        continue
        
    if "{!location.pathname.startsWith('/app/ava') && (" in line and '<div className="mobile-top-bar">' in lines[i+1]:
        continue # skip this line entirely!

    if '<div className="mobile-top-bar">' in line and "{!location.pathname.startsWith('/app/ava') && (" in lines[i-1]:
        # Inject the back button before the profile pic container
        new_lines.append(line)
        new_lines.append('''            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {location.pathname.startsWith('/app/ava') && (
                <button
                  onClick={() => window.history.back()}
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
''')
        continue
    
    if '<div style={{ position: \'relative\' }}>' in line and '<img' in lines[i+1] and '<div className="mobile-top-bar">' in lines[i-1]:
        new_lines.append(line)
        continue
        
    # We need to close the <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}> after the </AnimatePresence> and </div> block of profile menu.
    # Where does the profile menu end?
    # Around line 349:
    #                 </AnimatePresence>
    #               </div>
    #               <button className="mobile-top-bar__search"...
    if '<button className="mobile-top-bar__search"' in line and '</div>' in lines[i-1]:
        # We need to inject closing div BEFORE this button, but AFTER the previous div closes
        # Wait, the previous line is </div>, which closes the position: 'relative' div.
        # We need to close our new flex div right after that.
        new_lines[-1] = new_lines[-1].rstrip() + '\n            </div>\n'
        new_lines.append(line)
        continue
        
    if '</div>' in line and ')}' in lines[i+1] and "{!location.pathname.startsWith('/app/ava') && (" in lines[i+2]:
        # This is the end of the mobile-top-bar.
        new_lines.append(line)
        continue
        
    if ')}' in line and '</div>' in lines[i-1] and "{!location.pathname.startsWith('/app/ava') && (" in lines[i+1]:
        # Skip this )} because we removed the opening {!... && (
        continue
        
    # Remove paddingTop reset
    if "paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined," in line:
        line = line.replace("paddingTop: isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined,", "")
        new_lines.append(line)
        continue
        
    new_lines.append(line)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Updated app shell complex")
