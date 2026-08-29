from PIL import Image

src = 'C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png'
img = Image.open(src).convert('RGBA')

# The perfect center is x=512, y=402.
# We will crop exactly 420x420, which should tightly bound the white rounded box.
left = 512 - 210
right = 512 + 210
top = 402 - 210
bottom = 402 + 210

cropped = img.crop((left, top, right, bottom))
w, h = cropped.size

# Now we MUST make the cream background at the corners transparent.
# Top-left corner is guaranteed to be cream color.
bg_color = cropped.getpixel((5, 5))

def color_dist(c1, c2):
    return abs(c1[0]-c2[0]) + abs(c1[1]-c2[1]) + abs(c1[2]-c2[2])

pixels = cropped.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        dist = color_dist((r,g,b), bg_color[:3])
        # Make it transparent if it's close to the cream background
        if dist < 25:
            pixels[x, y] = (r, g, b, 0)
        elif dist < 45:
            alpha = int(255 * ((dist - 25) / 20))
            pixels[x, y] = (r, g, b, alpha)

targets = [
    "public/logo.png",
    "public/logo-emerald.png",
    "public/logo.webp",
    "public/favicon-16.png",
    "public/favicon-32.png",
    "public/favicon-180.png",
    "public/favicon-192.png",
    "public/favicon-512.png"
]

for t in targets:
    cropped.save(t)

# Save ICO
cropped.save("public/favicon.ico", format="ICO", sizes=[(16,16), (32,32), (64,64)])

# Restore AppShell styling to avoid double-rounding
appshell_path = 'src/components/layout/AppShell.tsx'
with open(appshell_path, 'r', encoding='utf-8') as f:
    appshell_content = f.read()

# Replace the specific styling string
appshell_content = appshell_content.replace("style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}", "style={{ width: '38px', height: '38px', objectFit: 'contain' }}")

with open(appshell_path, 'w', encoding='utf-8') as f:
    f.write(appshell_content)

print("Tight transparent logo generated!")
