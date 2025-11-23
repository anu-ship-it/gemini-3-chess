import React, { useState } from 'react';
import { Color } from 'chess.js';
import { useSpring, animated, config } from '@react-spring/three';

// Material colors
const WHITE_COLOR = "#f0f0f0";
const BLACK_COLOR = "#222222";
const SELECTED_COLOR = "#6366f1"; // Indigo glow

interface PieceGeometryProps {
  color: Color;
  position: [number, number, number];
  isSelected: boolean;
  onClick?: () => void;
  isHovered?: boolean;
}

// Reusable material setup
const PieceMaterial = ({ color, isSelected, isHovered }: { color: Color, isSelected: boolean, isHovered: boolean }) => {
  const baseColor = color === 'w' ? WHITE_COLOR : BLACK_COLOR;
  
  const { emissive, colorAnim } = useSpring({
    emissive: isSelected ? SELECTED_COLOR : (isHovered ? "#444" : "#000000"),
    colorAnim: isSelected ? SELECTED_COLOR : baseColor,
    config: config.default
  });

  return (
    <animated.meshStandardMaterial
      color={colorAnim}
      roughness={0.3}
      metalness={0.6}
      emissive={emissive}
      emissiveIntensity={isSelected ? 0.8 : 0}
    />
  );
};

// Wrapper for common animation logic
const AnimatedPieceGroup: React.FC<{
  position: [number, number, number];
  children: React.ReactNode;
  rotation?: [number, number, number];
  onClick?: () => void;
  color: Color;
  isSelected: boolean;
}> = ({ position, children, rotation = [0, 0, 0], onClick, color, isSelected }) => {
  const [hovered, setHover] = useState(false);

  // Smooth movement configuration
  const { pos, rot, scale } = useSpring({
    pos: [position[0], position[1] + (hovered || isSelected ? 0.3 : 0), position[2]],
    rot: rotation,
    scale: hovered || isSelected ? 1.1 : 1,
    config: config.gentle // Smoother easing
  });

  return (
    <animated.group 
      position={pos as any} 
      rotation={rot as any} 
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHover(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
           // @ts-ignore
           return React.cloneElement(child, { isHovered: hovered, isSelected, color });
        }
        return child;
      })}
    </animated.group>
  );
};

export const Pawn: React.FC<PieceGeometryProps> = (props) => {
  return (
    <AnimatedPieceGroup {...props}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.2, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.2, 0.8, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.2, 32, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
    </AnimatedPieceGroup>
  );
};

export const Rook: React.FC<PieceGeometryProps> = (props) => {
  return (
    <AnimatedPieceGroup {...props}>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.35, 1.2, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.3, 6]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
    </AnimatedPieceGroup>
  );
};

export const Knight: React.FC<PieceGeometryProps> = (props) => {
  const rotation: [number, number, number] = props.color === 'w' ? [0, -Math.PI / 2, 0] : [0, Math.PI / 2, 0];
  return (
    <AnimatedPieceGroup {...props} rotation={rotation}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.8, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 1.0, 0.1]} rotation={[-0.5, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.6, 0.5]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 1.3, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.28, 0.3, 0.3]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
    </AnimatedPieceGroup>
  );
};

export const Bishop: React.FC<PieceGeometryProps> = (props) => {
  return (
    <AnimatedPieceGroup {...props}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.2, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.3, 1.4, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.15, 32, 16]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
       <mesh position={[0, 1.5, 0]} rotation={[0,0,0.5]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0, 0.4, 4]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
    </AnimatedPieceGroup>
  );
};

export const Queen: React.FC<PieceGeometryProps> = (props) => {
  return (
    <AnimatedPieceGroup {...props}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.2, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.35, 1.6, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[0.3, 0.1, 0.3, 16]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.15, 32, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
    </AnimatedPieceGroup>
  );
};

export const King: React.FC<PieceGeometryProps> = (props) => {
  return (
    <AnimatedPieceGroup {...props}>
       <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.2, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.35, 1.8, 32]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
       <mesh position={[0, 2.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <PieceMaterial color={props.color} isSelected={props.isSelected} isHovered={false} />
      </mesh>
    </AnimatedPieceGroup>
  );
};