
import fs from 'fs';

const content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
let lines = content.split('\n');
let stack = [];

lines.forEach((line, i) => {
    let matches = line.match(/<[a-z0-9]+|<\/[a-z0-9]+/gi);
    if (matches) {
        matches.forEach(m => {
            if (m.startsWith('</')) {
                let tag = m.substring(2).toLowerCase();
                if (stack.length > 0) {
                    let last = stack.pop();
                    if (last.tag !== tag) {
                        // console.log(`Mismatch at line ${i+1}: expected </${last.tag}> but found ${m}`);
                    }
                }
            } else {
                // Check for self closing
                if (!line.includes(m + ' ') && !line.includes(m + '>') && line.includes(m) && line.includes('/>')) {
                     // Assume self closing
                } else {
                    let tag = m.substring(1).toLowerCase();
                    if (!['img', 'input', 'br', 'hr'].includes(tag)) {
                        stack.push({tag, line: i+1});
                    }
                }
            }
        });
    }
});

console.log("Unclosed tags at EOF:");
stack.forEach(s => console.log(`${s.tag} at line ${s.line}`));
