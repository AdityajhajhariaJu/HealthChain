import os

features_dir = 'src/features'
for root, dirs, files in os.walk(features_dir):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                lines = file.readlines()
                for i, line in enumerate(lines[:30]):
                    if 'background' in line and ('#fff' in line.lower() or '#f8fafc' in line.lower() or '#ffffff' in line.lower() or 'white' in line.lower()):
                        print(f"{path}:{i+1} - {line.strip()}")
