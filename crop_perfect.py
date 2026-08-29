from PIL import Image

src = 'C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png'
img = Image.open(src).convert('RGB')
w, h = img.size

# We know the background color is roughly the top-left pixel
bg_color = img.getpixel((10, 10))

def color_diff(c1, c2):
    return sum(abs(a - b) for a, b in zip(c1, c2))

# Find top edge of the white box
top = 0
for y in range(h):
    # check center column
    if color_diff(img.getpixel((w//2, y)), bg_color) > 30:
        top = y
        break

# Find bottom edge
bottom = h - 1
for y in range(h - 1, -1, -1):
    if y < top: break
    # check center column but exclude the black text at the bottom!
    # The black text is at the bottom, so we should scan upwards until we find the white box
    c = img.getpixel((w//2, y))
    # if it's white-ish, it's the bottom of the box
    if c[0] > 240 and c[1] > 240 and c[2] > 240:
        bottom = y
        break

# Find left edge
left = 0
for x in range(w):
    c = img.getpixel((x, (top+bottom)//2))
    if c[0] > 240 and c[1] > 240 and c[2] > 240:
        left = x
        break

# Find right edge
right = w - 1
for x in range(w - 1, -1, -1):
    c = img.getpixel((x, (top+bottom)//2))
    if c[0] > 240 and c[1] > 240 and c[2] > 240:
        right = x
        break

print(f"Exact Box: Left={left}, Top={top}, Right={right}, Bottom={bottom}")

# Crop tightly to this exact box
pad = 10
crop_box = (max(0, left-pad), max(0, top-pad), min(w, right+pad), min(h, bottom+pad))

img = Image.open(src).convert('RGBA')
cropped = img.crop(crop_box)

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

# Save ICO
icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
cropped.save("public/favicon.ico", format="ICO", sizes=icon_sizes)

print("Perfectly cropped and replaced all logos.")
