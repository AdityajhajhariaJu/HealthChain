from PIL import Image

src = 'C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png'
img = Image.open(src).convert('RGB')
w, h = img.size

# Find the bounding box of the dark/green letters "H" and "C"
min_x, min_y = w, h
max_x, max_y = 0, 0

# Only scan the top half to avoid the "HealthChain360" text at the bottom
for y in range(int(h * 0.65)):
    for x in range(w):
        r, g, b = img.getpixel((x, y))
        # The 'H' is black (low RGB), the 'C' is green (G dominant, low R and B)
        is_black = r < 50 and g < 50 and b < 50
        is_green = g > 100 and r < 100 and b < 100
        
        if is_black or is_green:
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

print(f"Letters Box: Left={min_x}, Top={min_y}, Right={max_x}, Bottom={max_y}")

if min_x < max_x and min_y < max_y:
    # We found the letters!
    # The letters box is say 200x100.
    # The white box around it is usually a square.
    letter_w = max_x - min_x
    letter_h = max_y - min_y
    center_x = (min_x + max_x) // 2
    center_y = (min_y + max_y) // 2
    
    # The white rounded square is usually a bit wider than the letters.
    # Let's say padding is roughly equal to letter_h
    size = max(letter_w, letter_h) + int(letter_h * 1.5)
    
    # Ensure it's a square
    left = center_x - size // 2
    right = center_x + size // 2
    top = center_y - size // 2
    bottom = center_y + size // 2
    
    crop_box = (max(0, left), max(0, top), min(w, right), min(h, bottom))
    print(f"Computed Crop Box: {crop_box}")
    
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

    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    cropped.save("public/favicon.ico", format="ICO", sizes=icon_sizes)
    print("Perfect crop applied.")
else:
    print("Could not detect letters.")
