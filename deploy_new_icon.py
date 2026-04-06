from PIL import Image
import os
import sys

def create_notification_icon(source_path, target_dirs):
    if not os.path.exists(source_path):
        print(f"File not found: {source_path}")
        return

    # Open the provided icon
    img = Image.open(source_path).convert("RGBA")
    
    pixels = img.load()
    width, height = img.size
    
    # We want to find the bounding box of where alpha > 10 (ignore dust/faint pixels)
    min_x = width
    min_y = height
    max_x = 0
    max_y = 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 10:
                # Also, if the user uploaded a black-on-white image that was auto-converted
                # maybe they have rgb(0,0,0,255) pixels that represent the lines.
                # All pixels with alpha > 10 will become WHITE.
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    if min_x > max_x:
        print("No valid logo pixels found in the image.")
        return
        
    print(f"Found true bbox: ({min_x}, {min_y}, {max_x}, {max_y})")
    
    # Crop to exact visible pixels
    cropped = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    
    # Render all visible pixels as pure white
    data = cropped.getdata()
    new_data = []
    for (r, g, b, a) in data:
        # Increase alpha slightly to ensure sharp visibility if it's antialiased
        new_a = min(255, int(a * 1.5)) if a > 5 else 0
        if new_a > 0:
            new_data.append((255, 255, 255, new_a))
        else:
            new_data.append((255, 255, 255, 0))
            
    cropped.putdata(new_data)
    
    sizes = {
        'mipmap-mdpi': 24,
        'mipmap-hdpi': 36,
        'mipmap-xhdpi': 48,
        'mipmap-xxhdpi': 72,
        'mipmap-xxxhdpi': 96
    }
    
    res_dir = 'C:/Users/hp/Pictures/ECM/android/app/src/main/res'
    
    for folder, size in sizes.items():
        target_dir = os.path.join(res_dir, folder)
        if os.path.exists(target_dir):
            # Target size leaving ~4% padding on each side so it's "big" but safe
            pad = int(size * 0.04) 
            target_box = size - (pad * 2)
            
            cw, ch = cropped.size
            ratio = min(target_box / cw, target_box / ch)
            new_w, new_h = max(1, int(cw * ratio)), max(1, int(ch * ratio))
            
            resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
            offset_x = (size - new_w) // 2
            offset_y = (size - new_h) // 2
            canvas.paste(resized, (offset_x, offset_y))
            
            out_path = os.path.join(target_dir, 'ic_notification.png')
            canvas.save(out_path, "PNG")
            print(f"Saved optimized icon to {out_path} ({size}x{size})")

if __name__ == "__main__":
    create_notification_icon('C:/Users/hp/Pictures/ECM/assets/ic_notification.png', [])
