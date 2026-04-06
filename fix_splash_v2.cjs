const sharp = require('sharp');
const path = require('path');

async function run() {
    const inputPath = path.join(__dirname, 'public', 'logo.png');
    const outputPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', 'drawable', 'splash.png');

    console.log('Loading logo from:', inputPath);

    // Step 1: Trim whitespace from the logo
    const trimmed = await sharp(inputPath)
        .trim()
        .toBuffer();

    const trimmedMeta = await sharp(trimmed).metadata();
    console.log(`Trimmed logo size: ${trimmedMeta.width}x${trimmedMeta.height}`);

    // Step 2: Remove white/near-white background by making those pixels transparent
    const { data, info } = await sharp(trimmed)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Make near-white pixels fully transparent
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // If pixel is near-white (all channels > 220), make it transparent
        if (r > 220 && g > 220 && b > 220) {
            data[i + 3] = 0; // fully transparent
        }
    }

    // Step 3: Rebuild the transparent logo
    const transparentLogo = await sharp(data, {
        raw: {
            width: info.width,
            height: info.height,
            channels: 4
        }
    }).png().toBuffer();

    // Step 4: Resize to fit Android 12 splash icon safe zone
    // Android 12 icon total = 288dp, at xxxhdpi(4x) = 1152px
    // Safe/visible circle = 240dp = 960px
    // Content safe zone = ~160dp = 640px
    // We use 600px to keep a nice margin inside the circle
    const maxLogoSize = 600;
    const resized = await sharp(transparentLogo)
        .resize(maxLogoSize, maxLogoSize, {
            fit: 'inside',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

    // Step 5: Center on a fully transparent 1152x1152 canvas
    await sharp({
        create: {
            width: 1152,
            height: 1152,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 } // fully transparent
        }
    })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(outputPath);

    console.log('SUCCESS: Created transparent splash.png for Android 12!');
    console.log('Output:', outputPath);
    console.log('The white background + white icon circle will now blend seamlessly.');
}

run().catch(err => console.error('ERROR:', err));
