const fs = require('fs');

let tempMap = fs.readFileSync('temp_map.tsx', 'utf-8');
const match = tempMap.match(/  return \([\s\S]+/);
const newReturn = match[0];

let liveMap = fs.readFileSync('components/dashboard/live-map.tsx', 'utf-8');
const lines = liveMap.split('\n');

// Find where "return (" starts for the grid
let returnIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('return (') && lines[i+1] && lines[i+1].includes('grid grid-cols-1')) {
    returnIdx = i;
    break;
  }
}

if (returnIdx === -1) throw new Error("Not found");

// keep everything before returnIdx
const keep = lines.slice(0, returnIdx).join('\n');

let finalFile = keep + '\n' + newReturn;

finalFile = finalFile.replace(
  "import { Play, Pause, X, ChevronRight } from 'lucide-react'",
  "import { Play, Pause, X, ChevronRight, Phone, Clock, Navigation, MapPin } from 'lucide-react'"
);

finalFile = finalFile.replace(
  "type: 'Feature' as const,\n        geometry: {\n           type: 'LineString' as const,\n           coordinates: coords\n        }",
  "type: 'Feature' as const,\n        properties: {},\n        geometry: {\n           type: 'LineString' as const,\n           coordinates: coords\n        }"
);

fs.writeFileSync('components/dashboard/live-map.tsx', finalFile);
console.log("Success");
