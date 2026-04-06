from PIL import Image
import os

def create_notification_icon(source_path, target_dirs):
    # Open the original logo
    img = Image.open(source_path).convert("RGBA")
    
    # Get bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    # Find all non-transparent pixels and make them solid white
    # Make transparent pixels fully transparent
    data = img.getdata()
    new_data = []
    for item in data:
        # item is (R, G, B, A)
        if item[3] > 0: # If it has any opacity
            new_data.append((255, 255, 255, item[3])) # White with original alpha
        else:
            new_data.append((255, 255, 255, 0)) # Fully transparent
            
    img.putdata(new_data)
    
    # Define Android notification icon sizes
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
            # Calculate new size while preserving aspect ratio, target is to fill bounded size.
            # We want it to be "big". So we scale the largest dimension to size.
            w, h = img.size
            ratio = min(size/w, size/h)
            new_w, new_h = int(w * ratio), int(h * ratio)
            
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # Create a transparent canvas of exact size x size
            canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
            offset = ((size - new_w) // 2, (size - new_h) // 2)
            canvas.paste(resized, offset)
            
            out_path = os.path.join(target_dir, 'ic_notification.png')
            canvas.save(out_path, "PNG")
            print(f"Saved {out_path} ({size}x{size})")

if __name__ == "__main__":
    create_notification_icon('C:/Users/hp/Pictures/ECM/public/logo.png', [])
