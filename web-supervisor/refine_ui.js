const fs = require('fs');

let liveMap = fs.readFileSync('components/dashboard/live-map.tsx', 'utf-8');

// 1. Theme Consistency (Dark/Light)
// bg-[#0a0a0c] -> bg-background
liveMap = liveMap.replace(/bg-\[#0a0a0c\]/g, 'bg-background');
// bg-[#121215] -> bg-card
liveMap = liveMap.replace(/bg-\[#121215\]/g, 'bg-card');
// bg-[#1a1a1f] -> bg-muted
liveMap = liveMap.replace(/bg-\[#1a1a1f\]/g, 'bg-muted');

// border-white/[0.05] -> border-border
liveMap = liveMap.replace(/border-white\/\[0\.05\]/g, 'border-border');

// text-white -> text-card-foreground
// Except for some specific texts that need to stay white inside colored badges.
liveMap = liveMap.replace(/<h2 className="text-white font-bold/g, '<h2 className="text-foreground font-bold');
liveMap = liveMap.replace(/text-zinc-200 group-hover:text-white/g, 'text-foreground group-hover:text-primary');
liveMap = liveMap.replace(/text-zinc-500 hover:text-white/g, 'text-muted-foreground hover:text-foreground');
liveMap = liveMap.replace(/text-zinc-400 hover:text-white/g, 'text-muted-foreground hover:text-foreground');
liveMap = liveMap.replace(/text-white font-semibold text-sm/g, 'text-foreground font-semibold text-sm');

// 2. Fix the scrollbar
// 'custom-scrollbar' is already added in live-map.tsx

// 3. Typo/Contrast
// "Selecciona un reponedor" contrast
liveMap = liveMap.replace(
  '<p className="text-zinc-500 text-xs mt-1 font-medium">',
  '<p className="text-muted-foreground text-xs mt-1 font-medium">'
);
// "Monitoreo Global" -> "Operaciones de Campo en Vivo"
liveMap = liveMap.replace(
  "{selectedWorker ? 'Ruta Activa' : 'Monitoreo Global'}",
  "{selectedWorker ? 'Ruta Activa' : 'Operaciones de Campo en Vivo'}"
);

// 4. Markers Redesign
// From white square with ping to subtle pulsating rings
liveMap = liveMap.replace(
  '<div className="absolute w-10 h-10 bg-white/20 rounded-full animate-ping" />',
  '<div className="absolute w-12 h-12 bg-emerald-500/30 rounded-full animate-ping" />'
);
liveMap = liveMap.replace(
  '<div className="w-5 h-5 bg-white rounded-[4px] shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10 border-2 border-black" />',
  '<div className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10 border-[3px] border-white" />'
);

// 5. Tooltip and padding on bottom '+' button
// Find bottom panel
liveMap = liveMap.replace(
  '<div className="bg-[#121215] rounded-[32px] p-6 shrink-0 border border-white/[0.05] shadow-2xl relative">',
  '<div className="bg-card rounded-[32px] p-6 pr-24 shrink-0 border border-border shadow-2xl relative">'
);
liveMap = liveMap.replace(
  '<button className="absolute right-6 bottom-6 w-12 h-12 bg-blue-500 rounded-[16px] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(59,130,246,0.5)] hover:bg-blue-400 transition-colors">',
  '<button title="Nueva Acción Rápida" className="absolute right-6 bottom-6 w-12 h-12 bg-primary rounded-[16px] text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">'
);

// Fix "Capas Visuales" text color
liveMap = liveMap.replace(
  '<button className="text-white text-sm font-semibold bg-white/10 px-4 py-1.5 rounded-full">',
  '<button className="text-primary-foreground text-sm font-semibold bg-primary px-4 py-1.5 rounded-full">'
);

// Fix select options text color inside map overlay
liveMap = liveMap.replace(
  'className="bg-transparent text-sm font-semibold outline-none cursor-pointer text-white [&>option]:bg-[#121215] [&>option]:text-white"',
  'className="bg-transparent text-sm font-semibold outline-none cursor-pointer text-foreground [&>option]:bg-card [&>option]:text-foreground"'
);
liveMap = liveMap.replace(
  'bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 text-white shadow-xl',
  'bg-background/60 backdrop-blur-md border border-border rounded-full px-4 py-2 flex items-center gap-3 text-foreground shadow-xl'
);
liveMap = liveMap.replace(
  'bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5 flex items-center gap-2 shadow-xl',
  'bg-background/60 backdrop-blur-md border border-border rounded-full px-2 py-1.5 flex items-center gap-2 shadow-xl'
);
liveMap = liveMap.replace(
  'bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white',
  'bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors text-primary'
);
liveMap = liveMap.replace(
  'bg-white/20 mx-1',
  'bg-border mx-1'
);

// FilterBtn colors
liveMap = liveMap.replace(
  "active ? 'bg-white/[0.05] border-white/[0.1] text-white' : 'bg-transparent border-transparent text-zinc-500 hover:bg-white/[0.02]'",
  "active ? 'bg-muted border-border text-foreground' : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50'"
);

// Missing icons for bottom panel
liveMap = liveMap.replace(
  '<button className="text-zinc-500 hover:text-white text-sm font-semibold transition-colors">Actividad Reciente</button>',
  '<button className="text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors">Actividad Reciente</button>'
);
liveMap = liveMap.replace(
  '<button className="text-zinc-500 hover:text-white text-sm font-semibold transition-colors">Transacciones</button>',
  '<button className="text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors">Transacciones</button>'
);

// Fix timeline colors
liveMap = liveMap.replace(
  'bg-zinc-800 border-zinc-700',
  'bg-muted border-border'
);
liveMap = liveMap.replace(
  'bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]',
  'bg-primary border-primary shadow-[0_0_15px_rgba(0,0,0,0.1)]'
);
liveMap = liveMap.replace(
  'text-zinc-500',
  'text-muted-foreground'
);
liveMap = liveMap.replace(
  'text-zinc-400',
  'text-foreground'
);

// Fix bg-black/40 in Driver Card
liveMap = liveMap.replace(
  /bg-black\/40/g,
  'bg-background'
);

fs.writeFileSync('components/dashboard/live-map.tsx', liveMap);
console.log("Refinements applied");
