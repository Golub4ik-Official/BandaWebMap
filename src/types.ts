export interface MapLayer {
  z: number;
  name: string;
  previewUrl?: string;
  fullUrl?: string;
  pipenetUrl?: string;
}

export interface MapLocation {
  id: string;
  name: string;
  z: number;
  x: number;
  y: number;
  tileCount: number;
  bounds?: [number, number, number, number];
  category: 'landmark' | 'major' | 'room';
}

export interface RoundOffset {
  x: number;
  y: number;
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
  hasLocations?: boolean;
  locationCount?: number;
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
