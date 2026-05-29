from PIL import Image
import os

def create_monochrome_drawables(source_path, res_dir):
    if not os.path.exists(source_path):
        print(f"Source file not found: {source_path}")
        return

    # Open source image and convert to RGBA
    img = Image.open(source_path).convert("RGBA")
    
    # Get bounding box of visible pixels (alpha > 0)
    bbox = img.getbbox()
    if not bbox:
        print("No visible pixels found in the image.")
        return
        
    print(f"Visible bounding box: {bbox}")
    cropped = img.crop(bbox)
    
    # Convert all non-transparent pixels to white, preserving original alpha
    data = cropped.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        if a > 0:
            new_data.append((255, 255, 255, a))
        else:
            new_data.append((255, 255, 255, 0))
            
    cropped.putdata(new_data)
    
    # Define sizes for each drawable folder
    sizes = {
        'drawable-mdpi': 24,
        'drawable-hdpi': 36,
        'drawable-xhdpi': 48,
        'drawable-xxhdpi': 72,
        'drawable-xxxhdpi': 96,
        'drawable': 48 # default fallback
    }
    
    for folder, size in sizes.items():
        target_dir = os.path.join(res_dir, folder)
        os.makedirs(target_dir, exist_ok=True)
        
        # Calculate target box size leaving 4% padding
        pad = int(size * 0.04)
        if pad < 1:
            pad = 1
        target_box = size - (pad * 2)
        
        cw, ch = cropped.size
        ratio = min(target_box / cw, target_box / ch)
        new_w, new_h = max(1, int(cw * ratio)), max(1, int(ch * ratio))
        
        # Resize using LANCZOS
        resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Create transparent canvas
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        offset_x = (size - new_w) // 2
        offset_y = (size - new_h) // 2
        canvas.paste(resized, (offset_x, offset_y))
        
        out_path = os.path.join(target_dir, 'ic_notification.png')
        canvas.save(out_path, "PNG")
        print(f"Saved: {out_path} ({size}x{size})")

if __name__ == "__main__":
    src = "assets/ic_notification.png"
    res = "android/app/src/main/res"
    create_monochrome_drawables(src, res)
