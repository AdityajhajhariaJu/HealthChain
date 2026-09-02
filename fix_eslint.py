import sys

# Fix MemoryService.js
path1 = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\MemoryService.js'
with open(path1, 'r', encoding='utf-8') as f:
    content1 = f.read()

content1 = content1.replace("} catch (e) {\n    }", "} catch (e) {\n      console.error('Error in memory service:', e);\n    }")

with open(path1, 'w', encoding='utf-8') as f:
    f.write(content1)

# Fix ProfileEngine.js
path2 = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\ProfileEngine.js'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = content2.replace("} catch (e) {\n    }", "} catch (e) {\n      console.error('Error in profile engine:', e);\n    }")

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)

print("Fixed empty catch blocks")
