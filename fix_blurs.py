import os
import re

count = 0
for root, dirs, files in os.walk("src"):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
            except UnicodeDecodeError:
                with open(path, "r", encoding="latin-1") as f:
                    content = f.read()
            
            # Use basic string replacement since we just want to add the transform property
            new_content = re.sub(r"(filter:\s*'blur\(\d+px\)')(?!.*translateZ)", r"\1, transform: 'translateZ(0)', willChange: 'transform'", content)
            
            if new_content != content:
                # Write back with utf-8
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print("Fixed", file)
                count += 1
print("Total:", count)

