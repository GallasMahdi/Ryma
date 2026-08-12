'use client';

import { memo, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import type { Service } from '@/data/services';
import {
  ZONE_VOLUMES,
  type BodyZone,
  type HotspotPoint,
  type ViewSide,
  type ViewerTheme,
} from './zone';

/* ------------------------------------------------------------------ */
/*  Direct Anatomical Zone Hitbox Component                             */
/* ------------------------------------------------------------------ */

interface ZoneHitboxProps {
  zoneKey: Exclude<BodyZone, 'all'>;
  config: (typeof ZONE_VOLUMES)['torso'];
  points: HotspotPoint[];
  theme: ViewerTheme;
  isActive: boolean;
  isHovered: boolean;
  onZoneSelect: (zone: BodyZone, defaultPoint: HotspotPoint) => void;
  onZoneHover: (zone: BodyZone | null) => void;
}

const ZoneHitbox = memo(function ZoneHitbox({
  zoneKey,
  config,
  points,
  theme,
  isActive,
  isHovered,
  onZoneSelect,
  onZoneHover,
}: ZoneHitboxProps) {
  const zonePoints = useMemo(
    () => points.filter((p) => p.zone === zoneKey || (zoneKey === 'torso' && p.zone === 'all')),
    [points, zoneKey],
  );

  const highlighted = isHovered || isActive;
  useCursor(highlighted);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (zonePoints.length > 0) {
      onZoneSelect(zoneKey, zonePoints[0]);
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onZoneHover(zoneKey);
  };

  const handlePointerOut = () => {
    onZoneHover(null);
  };

  return (
    <group position={config.position}>
      {/* Invisible volumetric raycast hit box covering exact anatomical region */}
      <mesh
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={config.args} />
        <meshBasicMaterial
          transparent
          opacity={isHovered ? 0.12 : isActive ? 0.05 : 0}
          color={theme === 'cyber' ? '#38BDF8' : '#2563EB'}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});

/* ------------------------------------------------------------------ */
/*  Main Direct Body Selection Group                                    */
/* ------------------------------------------------------------------ */

interface HotspotsProps {
  points: HotspotPoint[];
  serviceBySlug: Map<string, Service>;
  view: ViewSide;
  theme: ViewerTheme;
  lang: 'fr' | 'ar';
  selectionSlug: string | null;
  hoveredSlug: string | null;
  selectedZone: BodyZone;
  hoveredZone: BodyZone | null;
  onSelect: (point: HotspotPoint) => void;
  onZoneSelect: (zone: BodyZone) => void;
  onHoverChange: (slug: string | null) => void;
  onZoneHoverChange: (zone: BodyZone | null) => void;
  onTooltip: (point: HotspotPoint | null, x?: number, y?: number) => void;
  reduced: boolean;
}

export function Hotspots({
  points,
  serviceBySlug,
  view,
  theme,
  lang,
  selectionSlug,
  selectedZone,
  hoveredZone,
  onSelect,
  onZoneSelect,
  onHoverChange,
  onZoneHoverChange,
}: HotspotsProps) {
  const activeZoneKey = (keys: (keyof typeof ZONE_VOLUMES)[]) => {
    return keys.find(
      (k) =>
        selectedZone === k ||
        hoveredZone === k ||
        points.find((p) => p.serviceSlug === selectionSlug)?.zone === k,
    );
  };

  const handleZoneSelect = (zone: BodyZone, defaultPoint: HotspotPoint) => {
    onZoneSelect(zone);
    onSelect(defaultPoint);
  };

  const zonesToRender = (Object.keys(ZONE_VOLUMES) as (keyof typeof ZONE_VOLUMES)[]).filter(
    (k) => (view === 'back' ? k === 'back' || k === 'legs' || k === 'arms' : k !== 'back'),
  );

  return (
    <group>
      {zonesToRender.map((zoneKey) => {
        const config = ZONE_VOLUMES[zoneKey];
        const isSel = selectedZone === zoneKey || activeZoneKey([zoneKey]) !== undefined;
        const isHov = hoveredZone === zoneKey;

        return (
          <ZoneHitbox
            key={zoneKey}
            zoneKey={zoneKey}
            config={config}
            points={points}
            theme={theme}
            isActive={isSel}
            isHovered={isHov}
            onZoneSelect={handleZoneSelect}
            onZoneHover={onZoneHoverChange}
          />
        );
      })}
    </group>
  );
}