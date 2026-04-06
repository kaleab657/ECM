"""
Fix EthioCars splash screen icon for Android 12+.

Problem: drawable-night/splash.png is a black image causing a black blob on dark mode.
Solution: 
  1. Make drawable/splash.png have a transparent background (logo only)
  2. Delete drawable-night/splash.png so it falls back to the fixed drawable/splash.png
  3. Since windowSplashScreenIconBackgroundColor = #FFFFFF matches 
     windowSplashScreenBackground = #FFFFFF, the squircle mask becomes invisible,
     and the logo appears to float cleanly on white.
"""

from PIL import Image
import os
import shutil

BASE = r"c:\Users\hp\Pictures\ECM\android\app\src\main\res"

def make_transparent_splash(input_path, output_path):
    """Remove white/near-white background from splash PNG, keeping only the logo."""
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    # Threshold: any pixel with R,G,B all above this value is considered "white" (background)
    threshold = 240
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                # Make white/near-white pixels fully transparent
                pixels[x, y] = (r, g, b, 0)
    
    img.save(output_path, "PNG")
    print(f"  Saved transparent splash: {output_path} ({os.path.getsize(output_path)} bytes)")
    return img

# Step 1: Fix drawable/splash.png — make background transparent
print("=" * 60)
print("Step 1: Making drawable/splash.png background transparent")
print("=" * 60)
splash_path = os.path.join(BASE, "drawable", "splash.png")

# Backup first
backup_path = splash_path + ".backup"
if not os.path.exists(backup_path):
    shutil.copy2(splash_path, backup_path)
    print(f"  Backed up original to: {backup_path}")

make_transparent_splash(splash_path, splash_path)

# Step 2: Delete drawable-night/splash.png
print()
print("=" * 60)
print("Step 2: Removing drawable-night/splash.png (dark mode culprit)")
print("=" * 60)
night_splash = os.path.join(BASE, "drawable-night", "splash.png")
if os.path.exists(night_splash):
    # Backup
    night_backup = night_splash + ".backup"
    if not os.path.exists(night_backup):
        shutil.copy2(night_splash, night_backup)
        print(f"  Backed up to: {night_backup}")
    os.remove(night_splash)
    print(f"  DELETED: {night_splash}")
    
    # Remove empty directory if possible
    night_dir = os.path.dirname(night_splash)
    remaining = os.listdir(night_dir)
    # Only remove if just backups remain
    if all(f.endswith('.backup') for f in remaining):
        for f in remaining:
            os.remove(os.path.join(night_dir, f))
        os.rmdir(night_dir)
        print(f"  Removed empty directory: {night_dir}")
else:
    print(f"  Already removed: {night_splash}")

# Step 3: Verify
print()
print("=" * 60)
print("Step 3: Verification")
print("=" * 60)
final = Image.open(splash_path)
print(f"  Final splash.png: {final.size[0]}x{final.size[1]}, mode={final.mode}")
print(f"  File size: {os.path.getsize(splash_path)} bytes")
print(f"  Night splash exists: {os.path.exists(night_splash)}")
print()
print("DONE! The splash screen should now show:")
print("  - Clean white background")  
print("  - EthioCars logo centered (no black blob)")
print("  - Works in both light and dark mode")
