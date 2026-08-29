with open('src/features/consultation/QuickConsult.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "Quick Consult" in line and "marginBottom: '12px'" in lines[i-1]:
        for j in range(max(0, i-5), min(len(lines), i+15)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
