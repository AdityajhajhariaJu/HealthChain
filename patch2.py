import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace("import Dietician from './features/dietician/Dietician';", "import Dietician from './features/dietician/Dietician';\nimport { NutritionInterceptor } from './features/dietician/NutritionInterceptor';")

# Add route
route_string = '<Route path="/app/nutrition" element={<SafeRoute><NutritionInterceptor /></SafeRoute>} />'
content = content.replace('<Route path="/app/dietician"', f'{route_string}\n          <Route path="/app/dietician"')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
