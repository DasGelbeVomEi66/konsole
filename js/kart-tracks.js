// Streckendaten für Turbo-Flitzer. pts: [x, y, z, Breite]. Zonen beziehen sich auf den Streckenanteil 0..1.
// edge: 'wall' (sichtbare Wand), 'void' (Abgrund), 'water', 'lava'. grass: Breite des befahrbaren Randstreifens.
export const TRACKS = [
  {
    name: 'Sonnenhügel', theme: 'meadow', grip: 1, sky: ['#5aa8f0', '#cfe9ff'], fog: '#cfe9ff', ground: '#5fae45', road: '#55595f', curb: ['#e5242f', '#ffffff'], grass: 20, edge: 'wall', wall: 'fence',
    pts: [[0, 0, -170, 18], [110, 0, -175, 18], [185, 2, -135, 17], [205, 8, -60, 16], [175, 14, 5, 16], [105, 12, 15, 15], [60, 8, -40, 15], [10, 4, -75, 16], [-55, 2, -45, 16], [-70, 6, 30, 16], [-25, 12, 95, 16], [55, 9, 120, 17], [140, 3, 150, 17], [165, 0, 225, 16], [90, 0, 270, 16], [-30, 2, 255, 16], [-130, 8, 215, 16], [-205, 12, 135, 16], [-215, 6, 25, 17], [-190, 1, -95, 18], [-110, 0, -160, 18]],
    zones: [{ a: 0.24, b: 0.31, side: 'R', grass: 34 }, { a: 0.4, b: 0.46, side: 'L', grass: 30 }],
    boosts: [[0.2, 0], [0.52, -0.3], [0.78, 0.3]], ramps: [[0.36, 0], [0.62, 0]],
    obstacles: [{ t: 'hay', at: 0.08, lat: 0.45 }, { t: 'hay', at: 0.1, lat: -0.4 }, { t: 'hay', at: 0.55, lat: 0 }, { t: 'hay', at: 0.7, lat: -0.45 }, { t: 'hay', at: 0.72, lat: 0.4 }, { t: 'roller', at: 0.86, lat: 0, speed: 0.45 }],
  },
  {
    name: 'Krabbenstrand', theme: 'beach', grip: 1, sky: ['#3fa9f5', '#ffe9c4'], fog: '#ffe9c4', ground: '#f0d59a', road: '#6b6a68', curb: ['#ff8a1f', '#ffffff'], grass: 18, edge: 'wall', wall: 'rock',
    pts: [[0, 1, -160, 17], [160, 1, -170, 17], [260, 2, -120, 16], [290, 4, -20, 16], [250, 6, 60, 16], [170, 6, 80, 15], [120, 4, 40, 15], [60, 3, 60, 15], [30, 4, 140, 16], [-60, 6, 180, 16], [-170, 4, 150, 16], [-250, 2, 70, 16], [-260, 1, -40, 17], [-180, 1, -130, 17]],
    zones: [{ a: 0.46, b: 0.58, side: 'L', edge: 'water', grass: 6 }, { a: 0.74, b: 0.86, side: 'R', edge: 'water', grass: 6 }, { a: 0.12, b: 0.2, side: 'L', grass: 30 }],
    gaps: [[0.952, 0.97]], boosts: [[0.935, 0], [0.3, 0.3], [0.6, -0.3]], ramps: [[0.945, 0, 15]],
    obstacles: [{ t: 'crab', at: 0.22, lat: 0, speed: 1.2 }, { t: 'crab', at: 0.4, lat: 0, speed: 1.6 }, { t: 'crab', at: 0.82, lat: 0, speed: 1.4 }, { t: 'crab', at: 0.95, lat: 0, speed: 1.1 }, { t: 'rock', at: 0.5, lat: 0.35 }],
  },
  {
    name: 'Gletscherpass', theme: 'ice', grip: 0.62, sky: ['#6fa8dc', '#eef6ff'], fog: '#eef6ff', ground: '#f3f7fa', road: '#9fb9cb', curb: ['#2f7de1', '#ffffff'], grass: 14, edge: 'wall', wall: 'ice',
    pts: [[0, 0, -200, 17], [150, 4, -210, 16], [230, 10, -160, 15], [150, 16, -110, 14], [20, 20, -100, 14], [-60, 24, -60, 14], [20, 28, -10, 14], [150, 32, 0, 14], [230, 36, 50, 14], [170, 38, 120, 14], [40, 34, 140, 14], [-80, 28, 170, 15], [-200, 20, 140, 15], [-250, 10, 40, 16], [-220, 4, -90, 16], [-120, 0, -180, 17]],
    zones: [{ a: 0.18, b: 0.62, side: 'R', edge: 'void', grass: 3 }, { a: 0.62, b: 0.8, side: 'L', edge: 'void', grass: 3 }],
    boosts: [[0.12, 0], [0.5, 0], [0.85, 0.25]], ramps: [[0.7, 0]],
    obstacles: [{ t: 'snowball', at: 0.28, speed: 0.7 }, { t: 'snowball', at: 0.45, speed: 0.9 }, { t: 'snowball', at: 0.66, speed: 0.8 }, { t: 'rock', at: 0.35, lat: -0.4 }],
  },
  {
    name: 'Mondburg', theme: 'castle', grip: 1, sky: ['#0b0f26', '#3a2a5a'], fog: '#2a2148', ground: '#2b2e3a', road: '#3c404c', curb: ['#ffc83d', '#7b3fbf'], grass: 10, edge: 'wall', wall: 'castle',
    pts: [[0, 0, -220, 16], [160, 0, -225, 15], [220, 4, -200, 14], [230, 8, -100, 13], [180, 10, -60, 12], [60, 10, -60, 12], [20, 10, -20, 12], [30, 12, 60, 12], [140, 14, 70, 12], [220, 12, 110, 13], [230, 8, 230, 14], [120, 4, 250, 14], [0, 6, 200, 13], [-100, 10, 250, 13], [-220, 8, 220, 14], [-240, 4, 90, 15], [-160, 2, 30, 15], [-230, 0, -80, 16], [-140, 0, -200, 16]],
    zones: [{ a: 0.2, b: 0.36, side: 'B', edge: 'lava', grass: 2 }, { a: 0.43, b: 0.55, side: 'B', edge: 'lava', grass: 2 }, { a: 0.7, b: 0.78, side: 'L', edge: 'lava', grass: 3 }],
    boosts: [[0.15, 0], [0.4, 0], [0.62, 0], [0.92, 0]], ramps: [[0.58, 0]],
    obstacles: [{ t: 'geyser', at: 0.26, lat: -0.3 }, { t: 'geyser', at: 0.3, lat: 0.3 }, { t: 'geyser', at: 0.48, lat: 0 }, { t: 'geyser', at: 0.74, lat: -0.25 }, { t: 'geyser', at: 0.84, lat: 0.3 }, { t: 'roller', at: 0.06, lat: 0, speed: 0.5 }],
  },
  {
    name: 'Sternenbahn', theme: 'space', grip: 0.92, sky: ['#04020f', '#1a0b3a'], fog: '#0d0628', ground: '#000000', road: 'rainbow', curb: ['#ffffff', '#b8e8ff'], grass: 0, edge: 'void', wall: 'none',
    pts: [[0, 0, -250, 18], [200, 10, -250, 17], [300, 24, -160, 16], [250, 34, -60, 15], [120, 30, -90, 14], [40, 20, -20, 14], [100, 14, 70, 14], [230, 22, 90, 14], [300, 30, 190, 15], [220, 20, 300, 15], [60, 8, 280, 15], [-60, 0, 320, 14], [-180, -8, 260, 14], [-160, 4, 150, 14], [-60, 12, 120, 14], [-80, 20, 20, 14], [-200, 24, -20, 15], [-300, 16, -120, 16], [-200, 6, -230, 17]],
    zones: [], gaps: [[0.773, 0.783]],
    boosts: [[0.08, 0], [0.25, 0.35], [0.25, -0.35], [0.755, 0], [0.55, 0], [0.4, 0.3], [0.88, -0.3]], ramps: [[0.765, 0, 15], [0.6, 0], [0.92, 0]],
    obstacles: [{ t: 'meteor', at: 0.18, lat: 0.3 }, { t: 'meteor', at: 0.33, lat: -0.35 }, { t: 'meteor', at: 0.5, lat: 0.25 }, { t: 'meteor', at: 0.66, lat: -0.3 }, { t: 'meteor', at: 0.94, lat: 0.2 }],
  },
];
