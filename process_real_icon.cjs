const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processWheelIcon() {
    console.log("Starting final wheel icon processing (Buffer map logic)...");
    const inputFile = 'assets/ic_notification.png'; 
    const resDir = 'android/app/src/main/res';

    if (!fs.existsSync(inputFile)) {
        console.error("Input file not found at " + inputFile);
        return;
    }

    try {
        const densities = [
            { name: 'drawable-mdpi', size: 24 },
            { name: 'drawable-hdpi', size: 36 },
            { name: 'drawable-xhdpi', size: 48 },
            { name: 'drawable-xxhdpi', size: 72 },
            { name: 'drawable-xxxhdpi', size: 96 }
        ];

        // 1. Prepare base: Invert black lines to white lines
        const wheelMask = await sharp(inputFile)
            .greyscale()
            .negate()
            .threshold(50)
            .trim()
            .toBuffer();

        for (const d of densities) {
            const targetDir = path.join(resDir, d.name);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            const outputPath = path.join(targetDir, 'ic_notification.png');

            const logoSize = Math.floor(d.size * 0.88);
            const padding = Math.floor((d.size - logoSize) / 2);

            // Create the thickened mask at logoSize
            const mask = await sharp(wheelMask)
                .resize(logoSize, logoSize, { fit: 'contain' })
                .blur(0.8)
                .linear(1.5, -40)
                .threshold(60)
                .raw()
                .toBuffer();

            // Construct 4-channel RGBA manually: [255, 255, 255, mask_value]
            const rgba = Buffer.alloc(logoSize * logoSize * 4);
            for (let i = 0; i < mask.length; i++) {
                rgba[i * 4] = 255;     // Red
                rgba[i * 4 + 1] = 255; // Green
                rgba[i * 4 + 2] = 255; // Blue
                rgba[i * 4 + 3] = mask[i]; // Alpha (mask)
            }

            await sharp(rgba, { raw: { width: logoSize, height: logoSize, channels: 4 } })
                .extend({
                    top: padding,
                    bottom: d.size - logoSize - padding,
                    left: padding,
                    right: d.size - logoSize - padding,
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            console.log(`Saved ${d.name}/ic_notification.png`);
        }

        console.log("Definitive wheel status icons generated.");
    } catch (e) {
        console.error("Critical failure:", e);
    }
}

processWheelIcon();
