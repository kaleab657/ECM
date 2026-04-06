const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [
  { name: 'drawable-mdpi', size: 24 },
  { name: 'drawable-hdpi', size: 36 },
  { name: 'drawable-xhdpi', size: 48 },
  { name: 'drawable-xxhdpi', size: 72 },
  { name: 'drawable-xxxhdpi', size: 96 },
];

const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const iconSrc = path.join(__dirname, 'assets', 'notif_source.png');

async function run() {
  try {
    for (const { name, size } of sizes) {
      const outDir = path.join(resDir, name);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      for (const iconName of ['ic_notification.png']) {
        const outPath = path.join(outDir, iconName);

        // Resize with trim() to remove that tiny look!
        const { data, info } = await sharp(iconSrc)
          .trim() // REMOVE ALL EMPTY SPACE AROUND THE WHEEL
          .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .grayscale()
          .negate({ alpha: false })
          .threshold(100)
          .raw()
          .toBuffer({ resolveWithObject: true });

        const rgba = Buffer.alloc(size * size * 4);
        for (let i = 0; i < size * size; i++) {
          const lum = data[i * info.channels];
          if (lum > 128) {
            rgba[i * 4] = 255;
            rgba[i * 4 + 1] = 255;
            rgba[i * 4 + 2] = 255;
            rgba[i * 4 + 3] = 255;
          }
        }

        await sharp(rgba, { raw: { width: size, height: size, channels: 4 } })
          .png()
          .toFile(outPath);

        console.log(`Created BIG: ${name}/${iconName} (${size}x${size})`);
      }
    }
    console.log('\nSUCCESS: All BIG monochrome notification icons generated!');
  } catch (e) {
    console.error('ERROR:', e);
  }
}
run();
