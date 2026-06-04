const fs = require('fs');
let code = fs.readFileSync('app/actions.ts', 'utf-8');

const lastFunc = 'export async function addPdvToRoute';
const lastIdx = code.lastIndexOf(lastFunc);

if (lastIdx !== -1 && lastIdx > 1000) {
    // Only chop if we found the duplicate one at the end
    code = code.slice(0, lastIdx);
    fs.writeFileSync('app/actions.ts', code, 'utf-8');
    console.log('Chopped duplicate functions at the end of actions.ts');
} else {
    console.log('Did not find duplicate functions at end.');
}
