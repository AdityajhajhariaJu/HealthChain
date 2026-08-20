import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Lock to lucide-react imports
if 'Lock' not in content:
    content = content.replace("Settings,", "Settings,\n  Lock,")

# 2. Add locked property to Dietician
content = content.replace(
    "{ to: '/app/dietician', label: 'Dietician', icon: Apple },",
    "{ to: '/app/dietician', label: 'Dietician', icon: Apple, locked: true },"
)

# 3. Update the Desktop Sidebar links
old_desktop_link = """            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/app'}
                className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}
              >
                <l.icon size={18} aria-hidden="true" />
                {l.label}
              </NavLink>
            ))}"""

new_desktop_link = """            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.locked ? '#' : l.to}
                end={l.to === '/app'}
                onClick={(e) => {
                  if (l.locked) {
                    e.preventDefault();
                    alert(l.label + ' is coming soon!');
                  }
                }}
                className={({ isActive }) => `sidebar__link ${isActive && !l.locked ? 'active' : ''}`}
                style={{ opacity: l.locked ? 0.6 : 1, position: 'relative' }}
              >
                <l.icon size={18} aria-hidden="true" />
                {l.label}
                {l.locked && <Lock size={14} style={{ position: 'absolute', right: '20px' }} />}
              </NavLink>
            ))}"""

content = content.replace(old_desktop_link, new_desktop_link)


# 4. Update Mobile More Tools menu
old_mobile_link = """                  {links.filter(l => !mobileTabs.find(mt => mt.to === l.to)).map(l => (
                    <button
                      key={l.to}
                      onClick={() => navigate(l.to)}
                      className="more-menu-item"
                      style={{ border: 'none', background: 'none', outline: 'none' }}
                    >
                      <l.icon size={24} />
                      <span>{l.label}</span>
                    </button>
                  ))}"""

new_mobile_link = """                  {links.filter(l => !mobileTabs.find(mt => mt.to === l.to)).map(l => (
                    <button
                      key={l.to}
                      onClick={() => {
                        if (l.locked) {
                          alert(l.label + ' is coming soon!');
                          return;
                        }
                        navigate(l.to);
                        setShowMoreMenu(false);
                      }}
                      className="more-menu-item"
                      style={{ border: 'none', background: 'none', outline: 'none', position: 'relative', opacity: l.locked ? 0.6 : 1 }}
                    >
                      <l.icon size={24} />
                      <span>{l.label}</span>
                      {l.locked && <Lock size={16} style={{ position: 'absolute', top: '12px', right: '12px', opacity: 0.5 }} />}
                    </button>
                  ))}"""

content = content.replace(old_mobile_link, new_mobile_link)


with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
