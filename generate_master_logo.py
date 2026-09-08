import math
import os
import shutil
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

def generate_master_images():
    canvas_size = 2048
    s = canvas_size / 1000.0

    thickness = 88.0 * s
    r_cap = thickness / 2.0

    c_radius = 205.0 * s
    r_out = c_radius + thickness / 2.0
    r_in = c_radius - thickness / 2.0

    c_cx = 597.5 * s
    c_cy = 500.0 * s

    h_right_x = c_cx - c_radius
    h_left_x = h_right_x - 195.0 * s

    h_y1 = 240.0 * s
    h_y2 = 760.0 * s
    h_cross_y = 500.0 * s

    gap = 16.0 * s
    ko_r_out = r_out + gap

    start_deg = 36.0
    end_deg = 324.0

    def get_wedge(cx, cy, rin, rout, a1, a2, steps=300):
        pts = []
        for i in range(steps + 1):
            ang = math.radians(a1 + (a2 - a1) * (i / steps))
            pts.append((cx + rout * math.cos(ang), cy + rout * math.sin(ang)))
        for i in range(steps, -1, -1):
            ang = math.radians(a1 + (a2 - a1) * (i / steps))
            pts.append((cx + rin * math.cos(ang), cy + rin * math.sin(ang)))
        return pts

    def build_canvas(with_squircle=False, with_shadow=False, bg_color=(255, 255, 255)):
        img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        if with_squircle:
            radius = int(canvas_size * 0.22)
            pad = int(canvas_size * 0.05)
            if with_shadow:
                shadow = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
                sdraw = ImageDraw.Draw(shadow)
                sdraw.rounded_rectangle(
                    [pad, pad + int(14 * s), canvas_size - pad, canvas_size - pad + int(14 * s)],
                    radius=radius,
                    fill=(0, 0, 0, 35)
                )
                shadow = shadow.filter(ImageFilter.GaussianBlur(16 * s))
                img.paste(shadow, (0, 0), shadow)
            draw.rounded_rectangle(
                [pad, pad, canvas_size - pad, canvas_size - pad],
                radius=radius,
                fill=bg_color + (255,)
            )

        # 1. Draw H
        h_color = (15, 23, 42, 255) # Deep Obsidian Slate (#0F172A)
        # Left stem
        draw.line([(h_left_x, h_y1), (h_left_x, h_y2)], fill=h_color, width=int(thickness))
        draw.ellipse([h_left_x - r_cap, h_y1 - r_cap, h_left_x + r_cap, h_y1 + r_cap], fill=h_color)
        draw.ellipse([h_left_x - r_cap, h_y2 - r_cap, h_left_x + r_cap, h_y2 + r_cap], fill=h_color)

        # Right stem
        draw.line([(h_right_x, h_y1), (h_right_x, h_y2)], fill=h_color, width=int(thickness))
        draw.ellipse([h_right_x - r_cap, h_y1 - r_cap, h_right_x + r_cap, h_y1 + r_cap], fill=h_color)
        draw.ellipse([h_right_x - r_cap, h_y2 - r_cap, h_right_x + r_cap, h_y2 + r_cap], fill=h_color)

        # Crossbar
        draw.line([(h_left_x, h_cross_y), (h_right_x, h_cross_y)], fill=h_color, width=int(thickness))

        # 2. Knockout mask for C
        ko_pts = get_wedge(c_cx, c_cy, 0, ko_r_out, start_deg - 3.5, end_deg + 3.5)
        if with_squircle:
            draw.polygon(ko_pts, fill=bg_color + (255,))
        else:
            mask = Image.new('L', (canvas_size, canvas_size), 0)
            mdraw = ImageDraw.Draw(mask)
            mdraw.polygon(ko_pts, fill=255)
            r, g, b, a = img.split()
            a_arr = np.clip(np.array(a).astype(int) - np.array(mask).astype(int), 0, 255).astype(np.uint8)
            img = Image.merge('RGBA', (r, g, b, Image.fromarray(a_arr)))
            draw = ImageDraw.Draw(img)

        # 3. Draw C in Medical Emerald
        c_color = (61, 125, 94, 255) # Rich Forest Emerald (#3D7D5E)
        c_pts = get_wedge(c_cx, c_cy, r_in, r_out, start_deg, end_deg)
        draw.polygon(c_pts, fill=c_color)

        return img

    print("Rendering master high-resolution canvases...")
    master_trans = build_canvas(with_squircle=False)
    master_squircle = build_canvas(with_squircle=True, with_shadow=False)
    master_card = build_canvas(with_squircle=True, with_shadow=True)

    # Assets to generate:
    os.makedirs('public', exist_ok=True)

    # 1. logo.png (512x512 transparent)
    logo_trans_512 = master_trans.resize((512, 512), Image.Resampling.LANCZOS)
    logo_trans_512.save('public/logo.png', format='PNG', optimize=True)

    # 2. logo.webp
    logo_trans_512.save('public/logo.webp', format='WEBP', quality=95)

    # 3. logo-emerald.png (squircle card)
    logo_card_512 = master_card.resize((512, 512), Image.Resampling.LANCZOS)
    logo_card_512.save('public/logo-emerald.png', format='PNG', optimize=True)

    # 4. logo.jpg (clean white background)
    jpg_bg = Image.new('RGB', (512, 512), (255, 255, 255))
    jpg_bg.paste(logo_trans_512, (0, 0), logo_trans_512)
    jpg_bg.save('public/logo.jpg', format='JPEG', quality=95)

    # 5. Favicons
    for size, name in [
        (512, 'public/favicon-512.png'),
        (192, 'public/favicon-192.png'),
        (180, 'public/favicon-180.png'),
        (32, 'public/favicon-32.png'),
        (16, 'public/favicon-16.png'),
    ]:
        icon = master_squircle.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(name, format='PNG', optimize=True)

    # 6. favicon.ico
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    master_squircle.save('public/favicon.ico', format='ICO', sizes=ico_sizes)

    print("Assets generated in public/ successfully!")

    # Synchronize to dist/, android/, and ios/
    targets = [
        'dist',
        'android/app/src/main/assets/public',
        'ios/App/App/public'
    ]

    files_to_sync = [
        'logo.png', 'logo-emerald.png', 'logo.jpg', 'logo.webp',
        'favicon-16.png', 'favicon-32.png', 'favicon-180.png',
        'favicon-192.png', 'favicon-512.png', 'favicon.ico'
    ]

    for target in targets:
        if os.path.exists(target):
            print(f"Syncing assets to {target}...")
            for f in files_to_sync:
                src_path = os.path.join('public', f)
                dst_path = os.path.join(target, f)
                if os.path.exists(src_path):
                    shutil.copy2(src_path, dst_path)

    print("All static assets generated and synchronized across all platforms!")

if __name__ == '__main__':
    generate_master_images()
