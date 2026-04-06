from PIL import Image
import os

def create_notification_icon(source_path):
    if not os.path.exists(source_path):
        print(f"File not found: {source_path}")
        return

    # Open the provided icon
    img = Image.open(source_path).convert("RGBA")
    data = img.getdata()
    
    # We want to extract ONLY the dark lines (the tire) and make them white.
    # We want to completely eliminate any white backgrounds or transparent pixels.
    new_data = []
    
    # We will also track the bounding box of the actual dark pixels
    min_x = img.width
    min_y = img.height
    max_x = 0
    max_y = 0
    
    for y in range(img.height):
        for x in range(img.width):
            idx = y * img.width + x
            r, g, b, a = data[idx]
            
            # If the pixel is already transparent, ignore it
            if a < 10:
                new_data.append((255, 255, 255, 0))
                continue
                
            # Calculate how dark the pixel is (0 = black, 255 = white)
            luminance = 0.299 * r + 0.587 * g + 0.114 * b
            
            # If the pixel is very bright (part of the white background), make it transparent
            if luminance > 200:
                new_data.append((255, 255, 255, 0))
                continue
                
            # The darker the pixel, the more solid white it should be in the final icon.
            # Convert dark to opaque, light to transparent.
            opacity = 255 - int(luminance)
            # Combine original alpha with calculated opacity (just in case the edge is both light and partially transparent)
            final_a = int((opacity / 255.0) * (a / 255.0) * 255)
            
            if final_a > 10:
                new_data.append((255, 255, 255, final_a))
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
            else:
                new_data.append((255, 255, 255, 0))
                
    img.putdata(new_data)
    
    if min_x > max_x:
        print("Could not find the logo outline!")
        return
        
    print(f"Outline bounding box: ({min_x}, {min_y}, {max_x}, {max_y})")
    cropped = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    
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
            pad = int(size * 0.05) 
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
            print(f"Saved optimized crisp icon to {out_path} ({size}x{size})")

if __name__ == "__main__":
    create_notification_icon('C:/Users/hp/Pictures/ECM/assets/ic_notification.png')
