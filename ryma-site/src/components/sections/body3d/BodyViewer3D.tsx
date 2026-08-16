'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Service } from '@/data/services';
import type { Lang } from '@/lib/i18n';
import { ZONE_CAMERA_TARGETS, type BodyGender, type BodyZone, type HotspotPoint, type ViewSide, type ViewerTheme } from './zone';
import { HumanModel } from './AnatomicalModel';
import { Hotspots } from './Hotspots';
import { CanvasBackground, FloorShadow, ParticleField, SceneLights } from './scene-effects';

const MODEL_URL = '/models/human-anatomy.glb';

/**
 * Smoothly interpolates the camera position and lookAt target when selecting anatomical zones.
 */
function CinematicCameraController({
  selectedZone,
  controlsRef,
  reduced,
}: {
  selectedZone: BodyZone;
  controlsRef: React.RefObject<any>;
  reduced: boolean;
}) {
  const { camera } = useThree();
  const currentTarget = useRef(new THREE.Vector3(0, 0.88, 0));

  useFrame((_, delta) => {
    if (reduced || !controlsRef.current) return;

    const config = ZONE_CAMERA_TARGETS[selectedZone] || ZONE_CAMERA_TARGETS.all;
    const targetVec = new THREE.Vector3(...config.target);

    // Smooth lerp camera focus target
    currentTarget.current.lerp(targetVec, Math.min(delta * 5, 1));
    controlsRef.current.target.copy(currentTarget.current);

    // Smooth lerp camera distance/FOV
    const desiredPos = new THREE.Vector3(
      camera.position.x,
      config.target[1],
      config.distance,
    );
    camera.position.lerp(desiredPos, Math.min(delta * 4, 1));
    controlsRef.current.update();
  });

  return null;
}

export interface BodyViewer3DProps {
  view: ViewSide;
  selectedZone?: BodyZone;
  hoveredZone?: BodyZone | null;
  theme?: ViewerTheme;
  gender?: BodyGender;
  autoRotate?: boolean;
  points: HotspotPoint[];
  serviceBySlug: Map<string, Service>;
  selectionSlug: string | null;
  hoveredSlug: string | null;
  onSelect: (p: HotspotPoint) => void;
  onZoneSelect?: (zone: BodyZone) => void;
  onHoverChange: (slug: string | null) => void;
  onZoneHoverChange?: (zone: BodyZone | null) => void;
  reduced: boolean;
  lang: Lang;
  ariaLabel: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

interface TooltipState {
  x: number;
  y: number;
  point: HotspotPoint;
}

export function BodyViewer3D({
  view,
  selectedZone = 'all',
  hoveredZone = null,
  theme = 'satin',
  gender = 'male',
  autoRotate = false,
  points,
  serviceBySlug,
  selectionSlug,
  hoveredSlug,
  onSelect,
  onZoneSelect = () => {},
  onHoverChange,
  onZoneHoverChange = () => {},
  reduced,
  lang,
  ariaLabel,
  onKeyDown,
}: BodyViewer3DProps) {
  const [lowQuality, setLowQuality] = useState(false);
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    setLowQuality(coarse);
    setReady(true);
  }, []);

  useEffect(() => {
    useGLTF.preload(MODEL_URL);
  }, []);

  const handleTooltip = useCallback(
    (point: HotspotPoint | null, x?: number, y?: number) => {
      setTooltip(point ? { x: x ?? 0, y: y ?? 0, point } : null);
    },
    [],
  );

  const tooltipService = tooltip ? serviceBySlug.get(tooltip.point.serviceSlug) : null;
  const bgColor = theme === 'satin' ? '#F5F5F2' : '#0F172A';

  return (
    <div
      className="relative w-full aspect-[5/6] sm:aspect-[4/5] md:aspect-[5/6] overflow-hidden rounded-2xl select-none shadow-inner"
      style={{ background: bgColor }}
      role="img"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {ready && (
        <Canvas
          frameloop="always"
          dpr={[1, lowQuality ? 1.5 : 2]}
          shadows={!lowQuality}
          camera={{ position: [0, 0.88, 3.4], fov: 38, near: 0.1, far: 30 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            toneMapping: 3, // ACESFilmic
            toneMappingExposure: theme === 'satin' ? 1.05 : 1.2,
          }}
        >
          {/* Dynamic Background */}
          <color attach="background" args={[bgColor]} />
          <CanvasBackground theme={theme} />

          {/* Cinematic Smooth Camera Focus */}
          <CinematicCameraController
            selectedZone={selectedZone}
            controlsRef={controlsRef}
            reduced={reduced}
          />

          {/* 360° Touch / Mouse Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            enableZoom={false}
            enablePan={false}
            rotateSpeed={0.7}
            dampingFactor={0.06}
            enableDamping={true}
            minPolarAngle={Math.PI / 2 - 0.22}
            maxPolarAngle={Math.PI / 2 + 0.22}
            target={[0, 0.88, 0]}
          />

          {/* Lighting Setup */}
          <SceneLights lowQuality={lowQuality} theme={theme} />

          {/* 3D Body Model */}
          <Suspense fallback={null}>
            <HumanModel
              view={view}
              theme={theme}
              gender={gender}
              selectedZone={selectedZone}
              hoveredZone={hoveredZone || (hoveredSlug ? points.find(p => p.serviceSlug === hoveredSlug)?.zone ?? null : null)}
              reduced={reduced}
              autoRotate={autoRotate}
            />
          </Suspense>

          {/* Direct Body Zone Hitboxes & Service HUD */}
          <Hotspots
            points={points}
            serviceBySlug={serviceBySlug}
            view={view}
            theme={theme}
            lang={lang}
            selectionSlug={selectionSlug}
            hoveredSlug={hoveredSlug}
            selectedZone={selectedZone}
            hoveredZone={hoveredZone}
            onSelect={onSelect}
            onZoneSelect={onZoneSelect}
            onHoverChange={onHoverChange}
            onZoneHoverChange={onZoneHoverChange}
            onTooltip={handleTooltip}
            reduced={reduced}
          />

          {/* Floor Shadow */}
          <FloorShadow theme={theme} />
        </Canvas>
      )}
    </div>
  );
}

export default BodyViewer3D;