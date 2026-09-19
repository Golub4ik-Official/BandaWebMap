export interface MapLayer {
  z: number;
  name: string;
  previewUrl?: string;
  fullUrl?: string;
  pipenetUrl?: string;
}

export interface GameMap {
  id: string;
  server: 'bandamarines' | 'bandastation' | 'bandatroopers';
  name: string;
  fluffName?: string;
  category?: string;
  mapFile: string;
  mapPath?: string;
  width: number;
  height: number;
  zLevels: number;
  mainFloor?: number;
  webmapUrl?: string | null;
  announceText?: string;
  layers: MapLayer[];
}

export interface ServerConfig {
  id: 'bandamarines' | 'bandastation' | 'bandatroopers';
  name: string;
  shortName: string;
  color: string;
  maps: GameMap[];
}

export interface MapsManifest {
  generatedAt: string;
  totalMaps: number;
  servers: {
    bandamarines: ServerConfig;
    bandastation: ServerConfig;
    bandatroopers: ServerConfig;
  };
}
