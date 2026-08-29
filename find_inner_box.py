from PIL import Image

img = Image.open('C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png').convert('RGB')
w, h = img.size

min_x, min_y = w, h
max_x, max_y = 0, 0

# scan the top 75% of the image to find the "HC" logo (ignoring text at bottom)
for y in range(int(h * 0.75)):
    for x in range(w):
        r, g, b = img.getpixel((x, y))
        # Check if pixel is dark (black 'H') or green ('C')
        is_dark = r < 80 and g < 80 and b < 80
        is_green = g > 100 and g > r + 30 and g > b + 30
        
        if is_dark or is_green:
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

print(f"Inner logo bounds: Left={min_x}, Top={min_y}, Right={max_x}, Bottom={max_y}")

# Add padding for the white box
padding = 100
crop_box = (
    max(0, min_x - padding),
    max(0, min_y - padding),
    min(w, max_x + padding),
    min(h, max_y + padding)
)

print(f"Suggested Crop Box: {crop_box}")
