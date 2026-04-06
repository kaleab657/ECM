from PIL import Image
import os

def copy_raw_icon(source_path):
    # Open the provided icon exactly as the user provided it
    img = Image.open(source_path).convert("RGBA")
    
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
            # We want to scale the image cleanly into a 'size x size' square
            # WITHOUT cropping, altering colors, or cutting it off.
            cw, ch = img.size
            ratio = min(size / cw, size / ch)
            new_w, new_h = max(1, int(cw * ratio)), max(1, int(ch * ratio))
            
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # Create a fully transparent square canvas
            canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
            offset_x = (size - new_w) // 2
            offset_y = (size - new_h) // 2
            
            # Paste the exact resized image into the exact center of the square
            canvas.paste(resized, (offset_x, offset_y))
            
            out_path = os.path.join(target_dir, 'ic_notification.png')
            canvas.save(out_path, "PNG")
            print(f"Saved exact copy to {out_path} ({size}x{size})")

if __name__ == "__main__":
    copy_raw_icon(r'C:\Users\hp\Pictures\ECM\assets\ic_notification.png')
