const fs = require('fs');
const path = require('path');

const MAPS_JSON = path.join(__dirname, '../data/maps.json');
const PUBLIC_MAPS_JSON = path.join(__dirname, '../public/data/maps.json');
const PUBLIC_MAPS_DIR = path.join(__dirname, '../public/maps');

const data = JSON.parse(fs.readFileSync(MAPS_JSON, 'utf8'));

let updatedCount = 0;

for (const sKey in data.servers) {
  const serverDir = path.join(PUBLIC_MAPS_DIR, sKey);
  const server = data.servers[sKey];

  server.maps.forEach(map => {
    map.layers.forEach(layer => {
      const z = layer.z;
      const webpFile = `${map.id}-${z}.webp`;
      const webpPath = path.join(serverDir, webpFile);

      if (fs.existsSync(webpPath)) {
        // Direct local Full-HD WebP render
        layer.fullUrl = `maps/${sKey}/${webpFile}`;
        updatedCount++;
      }
    });
  });
}

data.generatedAt = new Date().toISOString();
fs.writeFileSync(MAPS_JSON, JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(PUBLIC_MAPS_JSON, JSON.stringify(data, null, 2), 'utf8');

console.log(`Successfully mapped ${updatedCount} layers directly to local Full-HD WebP renders!`);
