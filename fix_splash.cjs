const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function run() {
    const inputPath = path.join(__dirname, 'resources', 'icon.png');
    const outDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', 'drawable-nodpi');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    const outputPath = path.join(outDir, 'app_splash_safe.png');

    try {
        // We increase size to 750 (out of 1024) to make it a bit bigger ("little bigger")
        const resized = await sharp(inputPath).resize(950, 950, { fit: 'inside' }).toBuffer();
        
        // Solid white canvas - completely physically impossible for black bars to exist!
        await sharp({
            create: {
                width: 1024,
                height: 1024,
                channels: 4,
                // alpha: 1 means completely solid/opaque white
                background: { r: 255, g: 255, b: 255, alpha: 1 } 
            }
        })
        .composite([{ input: resized, gravity: 'center' }])
        .png()
        .toFile(outputPath);
        
        console.log("SUCCESS: Created app_splash_safe.png completely white with bolder logo!");
    } catch (e) {
        console.error("ERROR", e);
    }
}
run();
