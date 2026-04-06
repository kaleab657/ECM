const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// The server sends icon: 'ic_launcher' in FCM payloads.
// Android FCM SDK resolves this as a drawable resource FIRST, then mipmap.
// By placing a monochrome ic_launcher.png in drawable-* folders,
// notifications will use the monochrome version (correct for status bar),
// while the app icon in mipmap-* remains full color.

const sizes = [
  { name: 'drawable-mdpi', size: 24 },
  { name: 'drawable-hdpi', size: 36 },
  { name: 'drawable-xhdpi', size: 48 },
  { name: 'drawable-xxhdpi', size: 72 },
  { name: 'drawable-xxxhdpi', size: 96 },
];

const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const iconSrc = path.join(__dirname, 'assets', 'icon.png');

async function run() {
  try {
    for (const { name, size } of sizes) {
      const outDir = path.join(resDir, name);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      // Create BOTH ic_launcher.png and ic_notification.png (monochrome)
      for (const iconName of ['ic_launcher.png', 'ic_notification.png']) {
        const outPath = path.join(outDir, iconName);

        // Step 1: Resize onto white, flatten, grayscale, negate, threshold
        const { data, info } = await sharp(iconSrc)
          .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .grayscale()
          .negate({ alpha: false })
          .threshold(100)
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Step 2: Build RGBA — white+opaque where logo is, transparent elsewhere
        const rgba = Buffer.alloc(size * size * 4);
        for (let i = 0; i < size * size; i++) {
          const lum = data[i * info.channels];
          if (lum > 128) {
            rgba[i * 4] = 255;
            rgba[i * 4 + 1] = 255;
            rgba[i * 4 + 2] = 255;
            rgba[i * 4 + 3] = 255;
          }
          // else all zeros (transparent) — already initialized
        }

        await sharp(rgba, { raw: { width: size, height: size, channels: 4 } })
          .png()
          .toFile(outPath);

        console.log(`Created: ${name}/${iconName} (${size}x${size})`);
      }
    }

    console.log('\nSUCCESS: All monochrome notification icons generated!');
    console.log('ic_launcher.png in drawable-* = used by FCM for status bar icon');
    console.log('ic_launcher.png in mipmap-* = used by Android for app icon (untouched)');
  } catch (e) {
    console.error('ERROR:', e);
  }
}

run();
