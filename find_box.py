from PIL import Image

img = Image.open('C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png').convert('RGB')
w, h = img.size

# Find the first non-background pixel from the top in the middle column
bg_color = img.getpixel((10, 10))

def color_diff(c1, c2):
    return sum(abs(a - b) for a, b in zip(c1, c2))

# scan middle column to find top and bottom of the white box
top_y = -1
for y in range(h):
    if color_diff(img.getpixel((w//2, y)), bg_color) > 30:
        top_y = y
        break

bottom_y = -1
for y in range(top_y + 10, h):
    # Looking for where it transitions back to background
    if color_diff(img.getpixel((w//2, y)), bg_color) < 15:
        bottom_y = y
        break

# scan middle row (between top_y and bottom_y) to find left and right
mid_y = (top_y + bottom_y) // 2
left_x = -1
for x in range(w):
    if color_diff(img.getpixel((x, mid_y)), bg_color) > 30:
        left_x = x
        break

right_x = -1
for x in range(left_x + 10, w):
    if color_diff(img.getpixel((x, mid_y)), bg_color) < 15:
        right_x = x
        break

print(f"Detected bounding box: Left={left_x}, Top={top_y}, Right={right_x}, Bottom={bottom_y}")
