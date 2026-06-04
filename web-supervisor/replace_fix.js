const fs = require('fs');

const tempMap = fs.readFileSync('temp_map.tsx', 'utf-8');
const returnIndex = tempMap.indexOf('return (');
const returnBlock = tempMap.substring(returnIndex);

let liveMap = fs.readFileSync('components/dashboard/live-map.tsx', 'utf-8');
const liveReturnIndex = liveMap.indexOf('return (');
liveMap = liveMap.substring(0, liveReturnIndex) + returnBlock;

// Add properties to GeoJSON Feature in liveMap
liveMap = liveMap.replace(
  "type: 'Feature' as const,",
  "type: 'Feature' as const,\nproperties: {},"
);

fs.writeFileSync('components/dashboard/live-map.tsx', liveMap);
console.log("Replaced successfully properly.");
