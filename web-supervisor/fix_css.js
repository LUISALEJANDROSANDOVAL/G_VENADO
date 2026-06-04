const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf-8');

// Find the start of the garbage inserted by PowerShell echo
const garbageStart = css.indexOf('\0');
if (garbageStart !== -1) {
    css = css.slice(0, garbageStart);
}
// If \0 didn't match, maybe just truncate manually where it starts with spaces/nulls
else {
    const end = css.indexOf('}\n\n'); // End of the normal CSS (line 297)
    if (end !== -1) {
       css = css.slice(0, end + 3);
    }
}

// Append correctly
css += `
/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground));
}
`;

fs.writeFileSync('app/globals.css', css, 'utf-8');
console.log("globals.css fixed");
