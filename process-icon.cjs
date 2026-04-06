const sharp = require('sharp');
const fs = require('fs');

async function processIcon() {
    console.log("Starting image processing...");
    const inputFile = 'assets/icon.png';
    const playStoreFile = 'assets/icon-1024-playstore.png';
    const adaptiveFile = 'assets/icon-adaptive-foreground.png';

    if (!fs.existsSync(inputFile)) {
        console.error("icon.png not found!");
        return;
    }

    try {
        console.log("Reading and trimming base image...");
        // 1. Read the image and trim away the white/transparent background.
        // We use threshold to make sure near-white noise is also trimmed. 
        // Then we get the exact bounding box.
        const trimmed = await sharp(inputFile)
            .trim({ threshold: 250 }) // remove white/near-white/transparent edges
            .toBuffer();

        const metadata = await sharp(trimmed).metadata();
        console.log("Trimmed dimensions:", metadata.width, "x", metadata.height);

        // 2. Play Store Icon (1024x1024) - Logo takes up ~85% of the space
        // 85% of 1024 = 870. The longest side of the trimmed image will be scaled to 870px.
        const playStorePadding = Math.floor((1024 - 870) / 2); // 77px
        console.log("Generating Play Store Icon...");
        await sharp(trimmed)
            .resize({
                width: 870,
                height: 870,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            // Sharpen slightly as requested "Improve sharpness and contrast slightly if needed"
            .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
            .extend({
                top: playStorePadding,
                bottom: playStorePadding,
                left: playStorePadding,
                right: playStorePadding,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toFormat('png')
            .toFile(playStoreFile);

        console.log("Saved", playStoreFile);

        // 3. Adaptive Icon Foreground (1024x1024) - Safe Zone is ~66% of the container. 
        // 66% of 1024 = 675. Let's make the logo 650px to be perfectly safe.
        // It provides ample room for the Android adaptive mask (circle/squircle/teardrop).
        const adaptivePadding = Math.floor((1024 - 650) / 2); // 187px
        console.log("Generating Adaptive Icon Safe Version...");
        await sharp(trimmed)
            .resize({
                width: 650,
                height: 650,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
            .extend({
                top: adaptivePadding,
                bottom: adaptivePadding,
                left: adaptivePadding,
                right: adaptivePadding,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toFormat('png')
            .toFile(adaptiveFile);

        console.log("Saved", adaptiveFile);
        console.log("Icon processing completed successfully.");
    } catch (e) {
        console.error("Error processing text:", e);
    }
}

processIcon();
