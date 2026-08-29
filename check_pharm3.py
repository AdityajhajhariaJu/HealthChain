with open('src/features/tools/PharmacyHub.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'export default function' in line or 'function PharmacyHub' in line:
        for j in range(i, len(lines)):
            if 'return (' in lines[j] and '<' in lines[j+1]:
                for k in range(j, j+15):
                    print(f"{k+1}: {lines[k].rstrip()}")
                break
        break
