from PIL import Image

src = 'C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png'
img = Image.open(src).convert('RGB')
w, h = img.size

# Background color from top-left
bg_color = img.getpixel((10, 10))

# We want to find the bounding box of the white square.
# Let's scan from the top down to find the first row that differs significantly from bg_color
def color_dist(c1, c2):
    return abs(c1[0]-c2[0]) + abs(c1[1]-c2[1]) + abs(c1[2]-c2[2])

top = 0
for y in range(h//2):
    # check a few pixels in the middle of the row
    if color_dist(img.getpixel((w//2, y)), bg_color) > 30:
        top = y
        break

bottom = h
# start from middle and go down to avoid text at the very bottom
for y in range(h//2, h):
    # if we hit bg_color again in the center, that's the bottom of the white box
    if color_dist(img.getpixel((w//2, y)), bg_color) < 20:
        bottom = y
        break

left = 0
for x in range(w//2):
    if color_dist(img.getpixel((x, h//3)), bg_color) > 30:
        left = x
        break

right = w
for x in range(w//2, w):
    if color_dist(img.getpixel((x, h//3)), bg_color) < 20:
        right = x
        break

print(f"Detected bounding box: left={left}, top={top}, right={right}, bottom={bottom}")

# Make a precise crop based on these coordinates
pad = 10
c_left = max(0, left - pad)
c_top = max(0, top - pad)
c_right = min(w, right + pad)
c_bottom = min(h, bottom + pad)

# Ensure it's a perfect square
c_w = c_right - c_left
c_h = c_bottom - c_top
size = max(c_w, c_h)
center_x = (c_left + c_right) // 2
center_y = (c_top + c_bottom) // 2

final_left = max(0, center_x - size//2)
final_top = max(0, center_y - size//2)
final_right = min(w, center_x + size//2)
final_bottom = min(h, center_y + size//2)

print(f"Final Square Crop: left={final_left}, top={final_top}, right={final_right}, bottom={final_bottom}")

# Now crop and also make the cream background transparent!
cropped = Image.open(src).convert('RGBA').crop((final_left, final_top, final_right, final_bottom))

pixels = cropped.load()
cw, ch = cropped.size
for y in range(ch):
    for x in range(cw):
        r, g, b, a = pixels[x, y]
        dist = color_dist((r,g,b), bg_color)
        if dist < 20:
            pixels[x,y] = (r,g,b,0)
        elif dist < 40:
            alpha = int(255 * ((dist - 20) / 20))
            pixels[x,y] = (r,g,b,alpha)

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
    
cropped.save("public/favicon.ico", format="ICO", sizes=[(16,16), (32,32), (64,64)])

print("Done generating transparent perfectly cropped logo.")
