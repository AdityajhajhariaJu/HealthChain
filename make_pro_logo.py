from PIL import Image

src = 'C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png'
img = Image.open(src).convert('RGBA')

w, h = img.size
pixels = img.load()

# The top-left corner is guaranteed to be the cream background
bg_r, bg_g, bg_b, _ = pixels[10, 10]

# 1. Make the cream background transparent
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        # Calculate color distance to background
        dist = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
        # If it's very close to the cream background, make it transparent
        # We use a strict threshold so we don't accidentally make the white box transparent
        if dist < 25:
            pixels[x, y] = (r, g, b, 0)
        elif dist < 45:
            # anti-aliasing / soft edge for the shadow
            alpha = int(255 * ((dist - 25) / 20))
            pixels[x, y] = (r, g, b, alpha)

# 2. Now find the bounding box of the NON-TRANSPARENT pixels (which is the white box + text)
# We only care about the top 70% of the image to ignore the text
min_x, max_x = w, 0
min_y, max_y = h, 0

for y in range(int(h * 0.7)):
    for x in range(w):
        _, _, _, a = pixels[x, y]
        if a > 50: # If significantly visible
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

print(f"White Box Bounding Box: left={min_x}, top={min_y}, right={max_x}, bottom={max_y}")

# 3. Crop tightly to this bounding box, adding a small 10px safe margin
pad = 10
crop_left = max(0, min_x - pad)
crop_top = max(0, min_y - pad)
crop_right = min(w, max_x + pad)
crop_bottom = min(h, max_y + pad)

# Enforce square crop
crop_w = crop_right - crop_left
crop_h = crop_bottom - crop_top
size = max(crop_w, crop_h)

center_x = (crop_left + crop_right) // 2
center_y = (crop_top + crop_bottom) // 2

final_left = max(0, center_x - size // 2)
final_top = max(0, center_y - size // 2)
final_right = min(w, center_x + size // 2)
final_bottom = min(h, center_y + size // 2)

final_crop = img.crop((final_left, final_top, final_right, final_bottom))

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
    final_crop.save(t)

# Save JPG (needs white background instead of transparent)
bg = Image.new('RGB', final_crop.size, (255, 255, 255))
bg.paste(final_crop, mask=final_crop.split()[3]) # Use alpha channel as mask
bg.save("public/logo.jpg")

# Save ICO
icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
final_crop.save("public/favicon.ico", format="ICO", sizes=icon_sizes)

print("Professional transparent logo generated!")
