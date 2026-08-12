'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import type { ViewerTheme } from './zone';

/* ------------------------------------------------------------------ */
/*  Floating Luxury Ambient Particles (Soft Spa Bokeh)                 */
/* ------------------------------------------------------------------ */

export function ParticleField({ theme, lowQuality }: { theme: ViewerTheme; lowQuality: boolean }) {
  // Floating dots removed per user requirement for clean 3D body presentation
  return null;
}

/* ------------------------------------------------------------------ */
/*  Doctor Cabinet Lighting — High-end Private Clinic Setup           */
/* ------------------------------------------------------------------ */

export function SceneLights({ lowQuality, theme }: { lowQuality: boolean; theme: ViewerTheme }) {
  if (theme === 'cyber') {
    return (
      <>
        <ambientLight intensity={0.2} color="#0F172A" />
        <directionalLight position={[-3, 4, 3]} intensity={1.8} color="#0284C7" />
        <directionalLight position={[3, 3, 2]} intensity={1.5} color="#38BDF8" />
        <directionalLight position={[0, 2, -3]} intensity={2.2} color="#818CF8" />
        <pointLight position={[0, 1.2, 1.5]} intensity={1.0} color="#38BDF8" distance={4} />
      </>
    );
  }

  return (
    <>
      {/* Soft clinic ambient fill */}
      <ambientLight intensity={0.65} color="#F8FAFC" />

      {/* Main warm key light */}
      <directionalLight
        position={[-3, 4, 3]}
        intensity={1.4}
        color="#FFFBF0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Overhead clinic softbox fill */}
      <directionalLight
        position={[3, 3, 2]}
        intensity={0.6}
        color="#F0F9FF"
      />

      {/* Gentle back rim light for body outline separation */}
      <directionalLight
        position={[0, 2.5, -2.5]}
        intensity={0.8}
        color="#3B82F6"
      />

      {/* Procedural High-End Clinic HDRI Environment */}
      {!lowQuality && (
        <Environment resolution={256} frames={1}>
          <group>
            {/* Top examination room luminaire */}
            <Lightformer
              form="rect"
              intensity={2.2}
              color="#FFFFFF"
              position={[0, 4, 1.5]}
              scale={[5, 2.5, 1]}
            />
            {/* Left window warm bounce */}
            <Lightformer
              form="rect"
              intensity={1.2}
              color="#FFF7ED"
              position={[-4, 2.5, 1]}
              rotation-y={Math.PI / 2}
              scale={[4, 3, 1]}
            />
            {/* Right wall cool bounce */}
            <Lightformer
              form="rect"
              intensity={0.8}
              color="#F0F9FF"
              position={[4, 2, 1]}
              rotation-y={-Math.PI / 2}
              scale={[4, 3, 1]}
            />
          </group>
        </Environment>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Doctor Cabinet Wall Shader — Acoustic Slats & Frosted Glass       */
/* ------------------------------------------------------------------ */

const wallVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const wallFragmentSatin = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vec3 baseColor = vec3(0.96, 0.96, 0.95);   // #F5F5F2 warm luxury alabaster
    vec3 shadowColor = vec3(0.86, 0.88, 0.90); // #DCE2E6 soft corner shadow

    float slatPattern = sin(vUv.x * 140.0);
    float slatShading = smoothstep(-0.8, 0.8, slatPattern) * 0.02;

    vec2 center = vec2(0.5, 0.55);
    float dist = length(vUv - center);
    float spotGlow = exp(-dist * 2.0) * 0.12;

    vec3 finalColor = mix(shadowColor, baseColor, smoothstep(0.0, 0.75, 1.0 - dist * 0.7));
    finalColor += vec3(slatShading) + vec3(spotGlow * 0.85, spotGlow * 0.92, spotGlow);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const wallFragmentCyber = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vec3 baseColor = vec3(0.06, 0.09, 0.16);   // #0F172A
    vec3 gridColor = vec3(0.14, 0.25, 0.45);

    // Cyber grid lines
    vec2 grid = abs(fract(vUv * 30.0 - 0.5) - 0.5) / fwidth(vUv * 30.0);
    float line = min(grid.x, grid.y);
    float cGrid = 1.0 - min(line, 1.0);

    vec2 center = vec2(0.5, 0.55);
    float dist = length(vUv - center);
    float spotGlow = exp(-dist * 2.5) * 0.4;

    vec3 finalColor = baseColor + vec3(0.02, 0.08, 0.2) * cGrid * 0.3;
    finalColor += vec3(0.0, spotGlow * 0.6, spotGlow);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function CanvasBackground({ theme }: { theme: ViewerTheme }) {
  return (
    <group>
      {/* Clinic Back Wall */}
      <mesh position={[0, 0.9, -2.2]} renderOrder={-2}>
        <planeGeometry args={[10, 7.5]} />
        <shaderMaterial
          key={theme}
          vertexShader={wallVertex}
          fragmentShader={theme === 'satin' ? wallFragmentSatin : wallFragmentCyber}
          depthWrite={false}
        />
      </mesh>

      {/* Frosted Glass Architectural Partition Screen */}
      <mesh position={[0, 0.9, -1.8]} rotation={[0, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[3.4, 2.3]} />
        <meshPhysicalMaterial
          color={theme === 'satin' ? '#F8FAFC' : '#0F172A'}
          transmission={0.45}
          opacity={0.85}
          transparent
          roughness={0.2}
          metalness={0.05}
          clearcoat={0.7}
          clearcoatRoughness={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Clinic Room Baseboard Trim Line */}
      <mesh position={[0, 0.05, -2.15]}>
        <boxGeometry args={[10, 0.08, 0.02]} />
        <meshStandardMaterial color={theme === 'satin' ? '#CBD5E1' : '#1E293B'} roughness={0.3} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Clinic Floor & Contact Shadow                                     */
/* ------------------------------------------------------------------ */

export function FloorShadow({ theme }: { theme: ViewerTheme }) {
  return (
    <group>
      {/* Floor Plane */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial
          color={theme === 'satin' ? '#E2E8F0' : '#090D16'}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>

      {/* Contact Shadow underfoot */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={theme === 'satin' ? 0.35 : 0.6}
        scale={3.4}
        blur={2.5}
        far={1.6}
        resolution={512}
        color={theme === 'satin' ? '#1E293B' : '#0284C7'}
      />
    </group>
  );
}