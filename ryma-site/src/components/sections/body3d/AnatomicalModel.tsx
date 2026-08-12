'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { BodyGender, BodyZone, ViewSide, ViewerTheme } from './zone';

const MODEL_URL = '/models/human-anatomy.glb';

interface HumanModelProps {
  view: ViewSide;
  theme: ViewerTheme;
  gender?: BodyGender;
  selectedZone: BodyZone;
  hoveredZone: BodyZone | null;
  reduced: boolean;
  autoRotate: boolean;
}

export function HumanModel({
  view,
  theme,
  gender = 'male',
  selectedZone,
  hoveredZone,
  reduced,
  autoRotate,
}: HumanModelProps) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const innerGroup = useRef<THREE.Group>(null);

  // Target rotation: front = 0, back = π
  const targetY = useRef(view === 'front' ? 0 : Math.PI);

  const prevView = useRef(view);
  if (prevView.current !== view) {
    prevView.current = view;
    targetY.current = view === 'front' ? 0 : Math.PI;
  }

  // 1. Ultra-Luxury Satin Alabaster Material (Default Luxury Spa & Medical Clinic look)
  const satinMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#E2E8F0'),        // Pristine alabaster slate
        roughness: 0.28,                           // Smooth satin touch
        metalness: 0.08,                           // Subtle metallic luxury depth
        clearcoat: 0.6,                            // High-end protective polish
        clearcoatRoughness: 0.25,
        sheen: 0.45,
        sheenColor: new THREE.Color('#93C5FD'),    // Subtle ice-blue rim reflection
        transmission: 0.08,                        // Subsurface skin softness illusion
        thickness: 0.5,
        ior: 1.45,
        emissive: new THREE.Color('#000000'),
        emissiveIntensity: 0,
      }),
    [],
  );

  // 2. Holographic Cyber Material (Futuristic Medical Scan look)
  const cyberMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#0F172A'),
        roughness: 0.1,
        metalness: 0.8,
        clearcoat: 0.9,
        wireframe: false,
        transmission: 0.7,
        thickness: 0.8,
        opacity: 0.85,
        transparent: true,
        emissive: new THREE.Color('#0284C7'),
        emissiveIntensity: 0.25,
      }),
    [],
  );

  const activeMat = theme === 'satin' ? satinMaterial : cyberMaterial;

  // Apply material to all meshes in GLTF scene
  useLayoutEffect(() => {
    if (!scene) return;
    scene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      mesh.frustumCulled = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = activeMat;
    });
  }, [scene, activeMat]);

  // Frame loop for smooth rotation, athletic masculine proportions, organic breathing, and dynamic zone lighting glow
  useFrame((state, delta) => {
    if (!group.current) return;
    const time = state.clock.getElapsedTime();

    // ── Athletic Male Body Proportions vs Female Base Mesh ──
    if (innerGroup.current) {
      const isMale = gender === 'male';
      const targetScaleX = isMale ? 1.16 : 1.0;  // Broad shoulder width
      const targetScaleY = isMale ? 1.02 : 1.0;  // Athletic height
      const targetScaleZ = isMale ? 1.10 : 1.0;  // Chest volume

      innerGroup.current.scale.x += (targetScaleX - innerGroup.current.scale.x) * Math.min(delta * 6, 1);
      innerGroup.current.scale.y += (targetScaleY - innerGroup.current.scale.y) * Math.min(delta * 6, 1);
      innerGroup.current.scale.z += (targetScaleZ - innerGroup.current.scale.z) * Math.min(delta * 6, 1);

      // Organic micro-breathing motion
      if (!reduced) {
        const breathY = Math.sin(time * 1.8) * 0.002;
        innerGroup.current.position.y = breathY;
      }
    }

    // ── View Rotation Lerp or Auto-rotate ──
    if (autoRotate && !reduced) {
      targetY.current += delta * 0.35;
      group.current.rotation.y = targetY.current;
    } else if (reduced) {
      group.current.rotation.y = targetY.current;
    } else {
      const diff = targetY.current - group.current.rotation.y;
      if (Math.abs(diff) > 0.001) {
        group.current.rotation.y += diff * Math.min(delta * 6, 1);
      }
    }

    // ── Dynamic Zone Glow Accent on Body Mesh (Vibrant on hover, subtle on select) ──
    if (theme === 'satin') {
      const isHovered = Boolean(hoveredZone && hoveredZone !== 'all');
      const isSelected = Boolean(selectedZone && selectedZone !== 'all');
      const targetEmissive = isHovered
        ? new THREE.Color('#1E40AF')
        : isSelected
        ? new THREE.Color('#3B82F6')
        : new THREE.Color('#000000');
      const targetIntensity = isHovered ? 0.4 : isSelected ? 0.12 : 0.0;

      satinMaterial.emissive.lerp(targetEmissive, Math.min(delta * 8, 1));
      satinMaterial.emissiveIntensity += (targetIntensity - satinMaterial.emissiveIntensity) * Math.min(delta * 8, 1);
    } else {
      const isHovered = Boolean(hoveredZone && hoveredZone !== 'all');
      const isSelected = Boolean(selectedZone && selectedZone !== 'all');
      const targetEmissive = isHovered
        ? new THREE.Color('#38BDF8')
        : isSelected
        ? new THREE.Color('#0284C7')
        : new THREE.Color('#0284C7');
      const targetIntensity = isHovered ? 0.85 : isSelected ? 0.35 : 0.2;

      cyberMaterial.emissive.lerp(targetEmissive, Math.min(delta * 8, 1));
      cyberMaterial.emissiveIntensity += (targetIntensity - cyberMaterial.emissiveIntensity) * Math.min(delta * 8, 1);
    }
  });

  return (
    <group ref={group}>
      <group ref={innerGroup}>
        <primitive object={scene} />
      </group>
    </group>
  );
}


