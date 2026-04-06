from PIL import Image
import os

def process_perfect_icon(source_path):
    # Open the provided icon
    img = Image.open(source_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    
    # We will track the bounding box of the ACTUAL SOLID LOGO PIXELS
    min_x, min_y, max_x, max_y = img.width, img.height, 0, 0
    
    for y in range(img.height):
        for x in range(img.width):
            idx = y * img.width + x
            r, g, b, a = data[idx]
            
            # The user's image is a WHITE WHEEL on TRANSPARENT background.
            # Keep anything with decent opacity (a > 50) and make it pure white with the same opacity.
            if a > 50:
                new_data.append((255, 255, 255, a))
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
            else:
                new_data.append((255, 255, 255, 0))
                
    img.putdata(new_data)
    
    if min_x > max_x:
        print("Could not find the logo outline! All alpha < 50")
        return
        
    print(f"True Logo Bounding box: ({min_x}, {min_y}, {max_x}, {max_y})")
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
    process_perfect_icon('C:/Users/hp/Pictures/ECM/assets/ic_notification.png')
