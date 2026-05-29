
import fs from 'fs';

const content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;
const openForms = (content.match(/<form/g) || []).length;
const closeForms = (content.match(/<\/form>/g) || []).length;
const openMain = (content.match(/<main/g) || []).length;
const closeMain = (content.match(/<\/main>/g) || []).length;

console.log(`Divs: ${openDivs} open, ${closeDivs} close`);
console.log(`Forms: ${openForms} open, ${closeForms} close`);
console.log(`Main: ${openMain} open, ${closeMain} close`);

// Match pairs
let stack = [];
let lines = content.split('\n');
lines.forEach((line, i) => {
    let matches = line.match(/<[a-z0-9]+|<\/[a-z0-9]+/gi);
    if (matches) {
        matches.forEach(m => {
            if (m.startsWith('</')) {
                let tag = m.substring(2);
                if (stack.length > 0) {
                    let last = stack.pop();
                    if (last.tag !== tag) {
                        console.log(`Mismatch at line ${i+1}: expected </${last.tag}> but found ${m} (last opened at line ${last.line})`);
                    }
                } else {
                    console.log(`Extra close tag ${m} at line ${i+1}`);
                }
            } else if (!m.endsWith('/')) {
                let tag = m.substring(1);
                stack.push({tag, line: i+1});
            }
        });
    }
});
