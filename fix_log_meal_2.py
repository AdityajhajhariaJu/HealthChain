import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_code = """        addEvent('diet', 'dietician', `Logged Food: ${result.items.map((i: any) => i.name).join(', ')}`, {
            items: result.items,
            type: selectedMealType,
          });
        }
      } catch (err) {"""

new_code = """        addEvent('diet', 'dietician', `Logged Food: ${result.items.map((i: any) => i.name).join(', ')}`, {
            items: result.items,
            type: selectedMealType,
          });
        } else {
          toast.error('Analysis Failed', 'Could not parse the food entry. Try being more specific.');
        }
      } catch (err) {"""

content = content.replace(old_code, new_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed else block")
