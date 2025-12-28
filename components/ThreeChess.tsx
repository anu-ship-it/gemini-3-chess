import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, MeshReflectorMaterial, Float, Stars } from '@react-three/drei';
import { Square, Color, PieceSymbol } from 'chess.js';
import * as Pieces from './ChessPieces';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

// --- Constants ---
const BOARD_SIZE = 8;
const SQUARE_SIZE = 1.2;
const BOARD_OFFSET = (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;

// --- Helper Functions ---

const getPosition = (square: Square): [number, number, number] => {
  const file = square.charCodeAt(0) - 97; // a=0
  const rank = parseInt(square[1]) - 1;   // 1=0

  const x = file * SQUARE_SIZE - BOARD_OFFSET;
  const z = -(rank * SQUARE_SIZE - BOARD_OFFSET);

  return [x, 0, z];
};

const getDistance = (sq1: Square, sq2: Square) => {
  const f1 = sq1.charCodeAt(0);
  const r1 = parseInt(sq1[1]);
  const f2 = sq2.charCodeAt(0);
  const r2 = parseInt(sq2[1]);
  return Math.sqrt(Math.pow(f1 - f2, 2) + Math.pow(r1 - r2, 2));
};

const generateId = (type: string, color: string) => `${color}-${type}-${Math.random().toString(36).substr(2, 9)}`;

// --- Piece Tracking Hook ---
// This ensures that when a piece moves, we reuse the same React component (key)
// so the animation library can interpolate the position change smoothly.
const usePieceTracking = (
  boardState: ({ type: PieceSymbol, color: Color, square: Square } | null)[][],
  lastMove: { from: Square, to: Square } | null
) => {
  const prevPiecesRef = useRef<Record<string, { square: Square, type: PieceSymbol, color: Color }>>({});

  const trackedPieces = useMemo(() => {
    // 1. Flatten current board state
    const newPieces: { square: Square, type: PieceSymbol, color: Color }[] = [];
    boardState.forEach(row => row.forEach(p => {
      if(p) newPieces.push(p);
    }));

    // 2. Group by Type+Color (e.g., 'wp', 'br')
    const newGroups: Record<string, typeof newPieces> = {};
    newPieces.forEach(p => {
      const key = p.color + p.type;
      if(!newGroups[key]) newGroups[key] = [];
      newGroups[key].push(p);
    });

    // 3. Prepare previous groups
    const prevPieces = prevPiecesRef.current;
    const prevGroups: Record<string, { id: string, square: Square, type: PieceSymbol, color: Color }[]> = {};
    Object.entries(prevPieces).forEach(([id, p]) => {
       const key = p.color + p.type;
       if(!prevGroups[key]) prevGroups[key] = [];
       prevGroups[key].push({...p, id});
    });

    const result: { id: string, square: Square, type: PieceSymbol, color: Color }[] = [];
    const distinctKeys = new Set([...Object.keys(newGroups), ...Object.keys(prevGroups)]);

    distinctKeys.forEach(key => {
       const oldList = prevGroups[key] || [];
       const newList = newGroups[key] || [];

       const usedOld = new Set<number>();
       const usedNew = new Set<number>();

       // A. Exact Match (Piece didn't move)
       oldList.forEach((o, oIdx) => {
          const nIdx = newList.findIndex((n, i) => !usedNew.has(i) && n.square === o.square);
          if(nIdx !== -1) {
             usedNew.add(nIdx);
             usedOld.add(oIdx);
             result.push({ ...newList[nIdx], id: o.id });
          }
       });

       // B. Last Move Match (The piece that explicitly moved)
       if (lastMove) {
          const { from, to } = lastMove;
          const oIdx = oldList.findIndex((o, i) => !usedOld.has(i) && o.square === from);
          const nIdx = newList.findIndex((n, i) => !usedNew.has(i) && n.square === to);
          if(oIdx !== -1 && nIdx !== -1) {
              usedNew.add(nIdx);
              usedOld.add(oIdx);
              result.push({ ...newList[nIdx], id: oldList[oIdx].id });
          }
       }

       // C. Distance Match (Heuristic for Castling, displaced pieces, etc.)
       const remainingOld = oldList.map((o, i) => ({ ...o, idx: i })).filter(x => !usedOld.has(x.idx));
       const remainingNew = newList.map((n, i) => ({ ...n, idx: i })).filter(x => !usedNew.has(x.idx));

       const pairs = [];
       for(const rO of remainingOld) {
          for(const rN of remainingNew) {
             pairs.push({
               o: rO,
               n: rN,
               dist: getDistance(rO.square, rN.square)
             });
          }
       }
       // Sort by closest distance first
       pairs.sort((a, b) => a.dist - b.dist);

       const pairUsedOld = new Set<string>();
       const pairUsedNew = new Set<string>();

       for(const p of pairs) {
           if(!pairUsedOld.has(p.o.id) && !pairUsedNew.has(p.n.square)) {
               pairUsedOld.add(p.o.id);
               pairUsedNew.add(p.n.square);

               // Mark them as effectively used for this step
               // We add to result
               result.push({ ...p.n, id: p.o.id });
           }
       }

       // D. New pieces (Promotions, or initial load)
       newList.forEach((n, i) => {
           // If not matched in previous steps, verify if it's already in result
           // (It shouldn't be if we check usedNew correctly, but pair matching was separate)
           const alreadyInResult = result.find(r => r.square === n.square && r.type === n.type && r.color === n.color);
           if (!alreadyInResult) {
              result.push({ ...n, id: generateId(n.type, n.color) });
           }
       });
    });

    // Update Ref for next render
    const nextMap: Record<string, any> = {};
    result.forEach(r => nextMap[r.id] = r);
    prevPiecesRef.current = nextMap;

    return result;

  }, [boardState, lastMove]);

  return trackedPieces;
};

// --- Sub-Components ---

interface TileProps {
  x: number;
  z: number;
  isBlack: boolean;
  squareName: Square;
  isSelected: boolean;
  isPossibleMove: boolean;
  isLastMove: boolean;
  onClick: (square: Square) => void;
}

const Tile: React.FC<TileProps> = ({ x, z, isBlack, squareName, isSelected, isPossibleMove, isLastMove, onClick }) => {
  const [hovered, setHover] = useState(false);

  const baseColor = isBlack ? '#6b7d5c' : '#e8e4d9';

  const { color, emissive } = useSpring({
    color: isSelected ? '#3b82f6' : (isLastMove ? '#f59e0b' : (hovered ? '#60a5fa' : baseColor)),
    emissive: isSelected ? '#1d4ed8' : (isLastMove ? '#d97706' : (hovered ? '#2563eb' : '#000000')),
    config: { duration: 200 }
  });

  return (
    <group position={[x * SQUARE_SIZE - BOARD_OFFSET, 0, -(z * SQUARE_SIZE - BOARD_OFFSET)]}>
      <animated.mesh
        receiveShadow
        castShadow
        onClick={(e) => { e.stopPropagation(); onClick(squareName); }}
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
        position={[0, -0.05, 0]}
      >
        <boxGeometry args={[SQUARE_SIZE, 0.12, SQUARE_SIZE]} />
        <animated.meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.2}
          emissive={emissive}
          emissiveIntensity={0.2}
        />
      </animated.mesh>

      {/* Possible Move Indicator - Enhanced */}
      {isPossibleMove && (
        <group position={[0, 0.08, 0]}>
          <Float speed={3} rotationIntensity={0} floatIntensity={0.3} floatingRange={[0, 0.15]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.4, 0.5, 32]} />
              <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} emissive="#1d4ed8" emissiveIntensity={0.5} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.25, 32]} />
              <meshStandardMaterial color="#60a5fa" transparent opacity={0.5} emissive="#3b82f6" emissiveIntensity={0.3} />
            </mesh>
          </Float>
        </group>
      )}

      {/* Coordinate Labels */}
      {z === 0 && (
         <Text
           position={[0, 0.07, SQUARE_SIZE/2 - 0.1]}
           rotation={[-Math.PI/2, 0, 0]}
           fontSize={0.28}
           color={isBlack ? "#e8e4d9" : "#6b7d5c"}
           anchorY="bottom"
           fontWeight="bold"
           outlineWidth={0.01}
           outlineColor="#000000">
           {String.fromCharCode(97 + x)}
         </Text>
      )}
       {x === 0 && (
         <Text
           position={[-SQUARE_SIZE/2 + 0.1, 0.07, 0]}
           rotation={[-Math.PI/2, 0, 0]}
           fontSize={0.28}
           color={isBlack ? "#e8e4d9" : "#6b7d5c"}
           anchorX="left"
           fontWeight="bold"
           outlineWidth={0.01}
           outlineColor="#000000">
           {z + 1}
         </Text>
      )}
    </group>
  );
};

interface Board3DProps {
  fen: string;
  selectedSquare: Square | null;
  validMoves: Square[];
  lastMove: { from: Square, to: Square } | null;
  onSquareClick: (sq: Square) => void;
  boardState: ({ type: PieceSymbol, color: Color, square: Square } | null)[][];
}

const Board3D: React.FC<Board3DProps> = ({
  selectedSquare,
  validMoves,
  lastMove,
  onSquareClick,
  boardState
}) => {

  // --- Tiles Generation ---
  const tiles = [];
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) {
      const squareName = `${String.fromCharCode(97 + x)}${z + 1}` as Square;
      const isBlack = (x + z) % 2 !== 1;

      const isSelected = selectedSquare === squareName;
      const isPossibleMove = validMoves.includes(squareName);
      const isLastMove = lastMove ? (lastMove.from === squareName || lastMove.to === squareName) : false;

      tiles.push(
        <Tile
          key={squareName}
          x={x}
          z={z}
          isBlack={isBlack}
          squareName={squareName}
          isSelected={isSelected}
          isPossibleMove={isPossibleMove}
          isLastMove={isLastMove}
          onClick={onSquareClick}
        />
      );
    }
  }

  // --- Pieces Generation using Tracking Hook ---
  const trackedPieces = usePieceTracking(boardState, lastMove);

  const pieces = trackedPieces.map((p) => {
    const Component =
      p.type === 'p' ? Pieces.Pawn :
      p.type === 'r' ? Pieces.Rook :
      p.type === 'n' ? Pieces.Knight :
      p.type === 'b' ? Pieces.Bishop :
      p.type === 'q' ? Pieces.Queen :
      Pieces.King;

    return (
      <Component
        key={p.id}
        position={getPosition(p.square)}
        color={p.color}
        isSelected={selectedSquare === p.square}
        onClick={() => onSquareClick(p.square)}
      />
    );
  });

  return (
    <group>
      {/* Enhanced Board Frame */}
      <mesh position={[0, -0.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[SQUARE_SIZE * 8 + 1.6, 0.3, SQUARE_SIZE * 8 + 1.6]} />
        <meshStandardMaterial
          color="#1a0f08"
          roughness={0.3}
          metalness={0.5}
          emissive="#0f0806"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Inner Frame Border */}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[SQUARE_SIZE * 8 + 0.8, 0.08, SQUARE_SIZE * 8 + 0.8]} />
        <meshStandardMaterial
          color="#3d2817"
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Reflective Base Board */}
      <mesh position={[0, -0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SQUARE_SIZE * 8 + 0.4, SQUARE_SIZE * 8 + 0.4]} />
        <MeshReflectorMaterial
          mirror={0.8}
          blur={[500, 150]}
          resolution={2048}
          mixBlur={1.2}
          mixStrength={20}
          depthScale={1.2}
          minDepthThreshold={0.8}
          color="#0a0a0a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Tiles Container */}
      <group position={[0, 0.01, 0]}>
        {tiles}
      </group>

      {/* Pieces Container */}
      {pieces}
    </group>
  );
};

// --- Controls Component ---
const CameraController: React.FC<{ view: 'white' | 'black' }> = ({ view }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>();

  useEffect(() => {
    const newPos = view === 'white' ? new THREE.Vector3(0, 14, 14) : new THREE.Vector3(0, 14, -14);
    const startPos = camera.position.clone();
    let frame = 0;
    const duration = 60;

    const animate = () => {
      frame++;
      const t = frame / duration;
      const ease = 1 - Math.pow(1 - t, 3);

      if (t <= 1) {
        camera.position.lerpVectors(startPos, newPos, ease);
        camera.lookAt(0, 0, 0);
        requestAnimationFrame(animate);
      } else if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    };
    animate();

  }, [view, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      minDistance={8}
      maxDistance={25}
      enablePan={true}
      panSpeed={0.5}
      maxPolarAngle={Math.PI / 2.1}
      minPolarAngle={Math.PI / 6}
      enableDamping={true}
      dampingFactor={0.05}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      target={[0, 0, 0]}
    />
  );
}


interface ThreeChessProps {
  boardState: ({ type: PieceSymbol, color: Color, square: Square } | null)[][];
  fen: string;
  selectedSquare: Square | null;
  validMoves: Square[];
  lastMove: { from: Square, to: Square } | null;
  onSquareClick: (sq: Square) => void;
  turn: Color;
  view: 'white' | 'black';
}

const ThreeChess: React.FC<ThreeChessProps> = (props) => {
  return (
    <div className="w-full h-full absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800">
      <Canvas
        shadows
        camera={{ position: [0, 14, 14], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0a0f1e']} />

        {/* Enhanced Lighting Setup */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[15, 25, 15]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-bias={-0.0001}
        />
        <hemisphereLight
          args={['#87ceeb', '#4a5568', 0.6]}
          position={[0, 20, 0]}
        />
        <pointLight position={[-12, 8, -12]} intensity={0.8} color="#3b82f6" distance={30} />
        <pointLight position={[12, 8, 12]} intensity={0.8} color="#f59e0b" distance={30} />
        <spotLight
          position={[0, 25, 0]}
          angle={0.6}
          penumbra={1}
          intensity={0.5}
          castShadow
        />

        {/* Environment */}
        <Stars radius={150} depth={60} count={6000} factor={5} saturation={0} fade speed={0.5} />
        <Environment preset="night" blur={0.8} />
        <fog attach="fog" args={['#0a0f1e', 15, 60]} />

        {/* Game Content */}
        <Board3D {...props} />

        {/* Controls */}
        <CameraController view={props.view} />

        <ContactShadows
          resolution={2048}
          scale={45}
          blur={1.5}
          opacity={0.5}
          far={5}
          color="#000000"
          position={[0, -0.1, 0]}
        />
      </Canvas>
    </div>
  );
};

export default ThreeChess;
