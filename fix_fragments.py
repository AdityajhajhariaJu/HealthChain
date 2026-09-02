import sys
import re

fpath = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\layout\AppShell.tsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix showProfileMenu Fragment
content = content.replace("""              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'transparent' }}
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}""", """              <AnimatePresence>
                {showProfileMenu && (
                    <motion.div key="profile-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'transparent' }}
                      onClick={() => setShowProfileMenu(false)}
                    />
                )}
                {showProfileMenu && (
                    <motion.div key="profile-menu"
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}""")

# Remove the closing Fragment for profile menu
content = content.replace("""                        </div>
                      </motion.div>
                  </>
                )}
              </AnimatePresence>""", """                        </div>
                      </motion.div>
                )}
              </AnimatePresence>""")

# Fix showMoreMenu Fragment
content = content.replace("""            <AnimatePresence>
              {showMoreMenu && (
                <>
                  <motion.div
                    className="mobile-more-menu-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <motion.div 
                    className="mobile-more-menu\"""", """            <AnimatePresence>
              {showMoreMenu && (
                  <motion.div
                    key="more-backdrop"
                    className="mobile-more-menu-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMoreMenu(false)}
                  />
              )}
              {showMoreMenu && (
                  <motion.div 
                    key="more-menu"
                    className="mobile-more-menu\"""")

# Remove the closing Fragment for more menu
content = content.replace("""                    />
                  </div>
                </motion.div>
                </>
              )}
            </AnimatePresence>""", """                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>""")

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated AppShell fragments!")
