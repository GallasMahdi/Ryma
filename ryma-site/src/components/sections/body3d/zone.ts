export type BodyZone = 'all' | 'torso' | 'legs' | 'arms' | 'back';
export type ViewSide = 'front' | 'back';
export type ViewerTheme = 'satin' | 'cyber';
export type BodyGender = 'male' | 'female';

export interface HotspotPoint {
  serviceSlug: string;
  cx: number;
  cy: number;
  position3D?: [number, number, number];
  zone: BodyZone;
  label: { fr: string; ar: string };
}

/**
 * 3D Bounding Volumes for Direct Body Part Raycasting Click & Hover
 */
export const ZONE_VOLUMES: Record<Exclude<BodyZone, 'all'>, { position: [number, number, number]; args: [number, number, number]; label: { fr: string; ar: string } }> = {
  torso: { position: [0, 1.05, 0.02],  args: [0.38, 0.42, 0.28], label: { fr: 'Buste & Abdomen', ar: 'الصدر والبطن' } },
  arms:  { position: [0, 1.12, 0.0],   args: [0.72, 0.55, 0.24], label: { fr: 'Membres Supérieurs', ar: 'الأطراف العلوية' } },
  legs:  { position: [0, 0.45, 0.0],   args: [0.44, 0.78, 0.28], label: { fr: 'Membres Inférieurs', ar: 'الأطراف السفلية' } },
  back:  { position: [0, 1.05, -0.05], args: [0.38, 0.45, 0.24], label: { fr: 'Rachis & Dos', ar: 'الظهر والعمود الفقري' } },
};

/**
 * Per-zone accent palette shared with the 3D hotspot beacons.
 */
export const ZONE_COLORS: Record<BodyZone, { primary: string; glow: string; cyber: string }> = {
  all:   { primary: '#2563EB', glow: '#60A5FA', cyber: '#38BDF8' },
  torso: { primary: '#2563EB', glow: '#60A5FA', cyber: '#38BDF8' },
  legs:  { primary: '#059669', glow: '#34D399', cyber: '#34D399' },
  arms:  { primary: '#7C3AED', glow: '#A78BFA', cyber: '#F472B6' },
  back:  { primary: '#D97706', glow: '#FBBF24', cyber: '#FBBF24' },
};

/**
 * Camera focal targets and distances for cinematic 3D camera focus per zone.
 */
export const ZONE_CAMERA_TARGETS: Record<BodyZone, { target: [number, number, number]; fov: number; distance: number }> = {
  all:   { target: [0, 0.88, 0],   fov: 38, distance: 3.4 },
  torso: { target: [0, 1.05, 0],   fov: 30, distance: 2.3 },
  legs:  { target: [0, 0.45, 0],   fov: 30, distance: 2.2 },
  arms:  { target: [0, 1.15, 0],   fov: 32, distance: 2.4 },
  back:  { target: [0, 1.05, 0],   fov: 30, distance: 2.3 },
};

/**
 * World-space anchor constants for the anatomical model
 */
export const MODEL = {
  height: 1.77,
  halfWidth: 0.5,
  frontDepth: 0.20,
} as const;

/** Maps point coordinates to exact 3D world space on anatomical model surface. */
export function pointToWorld(p: HotspotPoint, view: ViewSide): [number, number, number] {
  if (p.position3D) {
    if (view === 'back') {
      return [p.position3D[0], p.position3D[1], -p.position3D[2]];
    }
    return p.position3D;
  }
  const x = ((p.cx - 50) / 50) * MODEL.halfWidth;
  const y = ((116 - p.cy) / 116) * MODEL.height;
  const z = view === 'front' ? MODEL.frontDepth : -MODEL.frontDepth;
  return [x, y, z];
}


