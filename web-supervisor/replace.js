const fs = require('fs');

// Read temp_map.tsx
const tempMap = fs.readFileSync('temp_map.tsx', 'utf-8');
const returnBlockMatch = tempMap.match(/return \([\s\S]*\}\n$/);
if (!returnBlockMatch) {
  console.log("Could not find return block in temp_map.tsx");
  process.exit(1);
}
let returnBlock = returnBlockMatch[0];

// Read live-map.tsx
let liveMap = fs.readFileSync('components/dashboard/live-map.tsx', 'utf-8');

// Replace imports
liveMap = liveMap.replace(
  "import { Play, Pause, X, ChevronRight } from 'lucide-react'",
  "import { Play, Pause, X, ChevronRight, Phone, Clock, Navigation, MapPin } from 'lucide-react'"
);

// Replace return block
liveMap = liveMap.replace(/return \([\s\S]*\}\n$/, returnBlock);

fs.writeFileSync('components/dashboard/live-map.tsx', liveMap);
console.log("Replaced successfully.");
