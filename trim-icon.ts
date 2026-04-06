import sharp from 'sharp';
import fs from 'fs';

async function crop() {
  const inputPath = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\9498d435-84f7-4ab1-9211-f54b9e09de5a\\media__1774624825879.png';
  console.log('Reading ' + inputPath);
  
  // Trim removes continuous background color edges
  await sharp(inputPath)
    .trim({
      background: { r: 255, g: 255, b: 255, alpha: 1 }, 
      threshold: 15 // Tolerance for compression artifacts
    })
    .toFile('assets/icon_trimmed.png');

  // Copy trimmed to the various sizes
  fs.copyFileSync('assets/icon_trimmed.png', 'assets/icon.png');
  fs.copyFileSync('assets/icon_trimmed.png', 'assets/splash.png');
  fs.copyFileSync('assets/icon_trimmed.png', 'public/splash.png');

  console.log('Successfully trimmed unnecessary padding and overwrote assets');
}
crop().catch(err => {
  console.error(err);
  process.exit(1);
});
