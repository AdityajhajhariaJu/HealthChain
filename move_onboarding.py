import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove from inside AppShell
target = """<Route path="/app/onboarding" element={<SafeRoute><OnboardingFlow /></SafeRoute>} />"""
content = content.replace(target, "")

# Add it outside AppShell, just before the AppShell route
appshell_route = """<Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >"""

new_onboarding_route = """<Route
          path="/app/onboarding"
          element={
            <ProtectedRoute>
              <SafeRoute>
                <PageTransition>
                  <OnboardingFlow />
                </PageTransition>
              </SafeRoute>
            </ProtectedRoute>
          }
        />\n        """

content = content.replace(appshell_route, new_onboarding_route + appshell_route)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Moved OnboardingFlow outside of AppShell")
