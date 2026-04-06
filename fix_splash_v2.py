"""
Fix splash screen v2: Switch from Theme.SplashScreen (which forces icon masking)
to a classic windowBackground approach (logo floats on white, no mask).
"""

from PIL import Image
import os

BASE = r"c:\Users\hp\Pictures\ECM\android\app\src\main\res"

def crop_logo_with_padding(input_path, output_path, padding_percent=0.3):
    """Crop to just the logo area with some padding, keep transparent background."""
    img = Image.open(input_path).convert("RGBA")
    
    # Find bounding box of non-transparent pixels
    pixels = img.load()
    w, h = img.size
    
    min_x, min_y = w, h
    max_x, max_y = 0, 0
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a > 10:  # Non-transparent pixel
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    
    logo_w = max_x - min_x
    logo_h = max_y - min_y
    
    print(f"  Logo bounds: ({min_x},{min_y}) to ({max_x},{max_y}) = {logo_w}x{logo_h}")
    
    # Add padding around the logo
    pad_x = int(logo_w * padding_percent)
    pad_y = int(logo_h * padding_percent)
    
    crop_x1 = max(0, min_x - pad_x)
    crop_y1 = max(0, min_y - pad_y)
    crop_x2 = min(w, max_x + pad_x)
    crop_y2 = min(h, max_y + pad_y)
    
    cropped = img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
    cropped.save(output_path, "PNG")
    print(f"  Saved: {output_path} ({cropped.size[0]}x{cropped.size[1]}, {os.path.getsize(output_path)} bytes)")

# Step 1: Create drawable-nodpi directory and cropped logo
print("Step 1: Creating cropped splash_logo.png in drawable-nodpi/")
nodpi_dir = os.path.join(BASE, "drawable-nodpi")
os.makedirs(nodpi_dir, exist_ok=True)

splash_src = os.path.join(BASE, "drawable", "splash.png")
logo_dst = os.path.join(nodpi_dir, "splash_logo.png")
crop_logo_with_padding(splash_src, logo_dst, padding_percent=0.4)

print("\nDone! splash_logo.png created.")
