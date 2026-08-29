from PIL import Image, ImageDraw

src = 'C:/Users/adity/.gemini/antigravity/brain/d2367755-107c-4d07-9ec6-fca3eb30f6b3/.user_uploaded/media_1787992196868.png'
img = Image.open(src).convert('RGBA')

# Crop to 340x340 perfectly centered (x=512, y=402). 
# This is well inside the white box, so we get pure white background + logo.
left = 512 - 170
right = 512 + 170
top = 402 - 170
bottom = 402 + 170

cropped = img.crop((left, top, right, bottom))
w, h = cropped.size

# Create a rounded rectangle mask
radius = 60 # nice rounded corners
mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(mask)
draw.rounded_rectangle((0, 0, w, h), radius=radius, fill=255)

# Apply mask
final_img = Image.new('RGBA', (w, h))
final_img.paste(cropped, (0, 0), mask=mask)

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
    final_img.save(t)

# Save ICO without rounded mask (browsers often expect squares for favicons, or we can use the rounded one. Let's use the rounded one for consistency)
icon_sizes = [(16,16), (32,32), (64,64)]
final_img.save("public/favicon.ico", format="ICO", sizes=icon_sizes)

print("Perfect rounded logo generated using alpha mask!")
