import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\ARGroceryLens.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the canvas drawing logic
find_code = """        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);"""

replace_code = """        const canvas = document.createElement('canvas');
        // Downscale to max 800px width/height to avoid Vercel 4.5MB payload limit
        const MAX_DIM = 800;
        let w = videoRef.current.videoWidth;
        let h = videoRef.current.videoHeight;
        if (w > h && w > MAX_DIM) {
          h = Math.round((h * MAX_DIM) / w);
          w = MAX_DIM;
        } else if (h > MAX_DIM) {
          w = Math.round((w * MAX_DIM) / h);
          h = MAX_DIM;
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, w, h);
          const base64 = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality"""

content = content.replace(find_code, replace_code)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added downscaling")
