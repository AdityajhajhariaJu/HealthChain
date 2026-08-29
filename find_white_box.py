from PIL import Image

img = Image.open('C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png').convert('RGB')
w, h = img.size

# start at center, which should be the white box
cx, cy = w // 2, h // 2 - 100

def is_white_ish(color):
    r, g, b = color
    return r > 240 and g > 240 and b > 240

# expand left
left = cx
while left > 0 and is_white_ish(img.getpixel((left, cy))):
    left -= 1

# expand right
right = cx
while right < w - 1 and is_white_ish(img.getpixel((right, cy))):
    right += 1

# expand top
top = cy
while top > 0 and is_white_ish(img.getpixel((cx, top))):
    top -= 1

# expand bottom
bottom = cy
while bottom < h - 1 and is_white_ish(img.getpixel((cx, bottom))):
    bottom += 1

print(f"White Box detected: Left={left}, Top={top}, Right={right}, Bottom={bottom}")
print(f"Width={right-left}, Height={bottom-top}")

# If we didn't hit a solid white box (maybe it's off-white), let's lower the threshold
