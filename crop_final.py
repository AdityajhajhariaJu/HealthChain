from PIL import Image

src = 'C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png'
img = Image.open(src).convert('RGBA')

# Precise, tightly zoomed square crop that excludes the text and massive cream borders
left = 330
right = 694
top = 220
bottom = 584

cropped = img.crop((left, top, right, bottom))

targets = [
    "public/logo.png",
    "public/logo-emerald.png",
    "public/logo.jpg",
    "public/logo.webp",
    "public/favicon-16.png",
    "public/favicon-32.png",
    "public/favicon-180.png",
    "public/favicon-192.png",
    "public/favicon-512.png"
]

for t in targets:
    if t.endswith('.jpg'):
        cropped.convert('RGB').save(t)
    else:
        cropped.save(t)

icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
cropped.save("public/favicon.ico", format="ICO", sizes=icon_sizes)

print("Tightly cropped and updated!")
