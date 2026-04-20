import React, { useMemo, useRef, useState } from "react";
import "./Triangle3D.css";

interface HexData {
  position: string;
  player: "j1" | "j2" | null;
}

interface Triangle3DProps {
  hexData: HexData[];
  onHexClick: (position: string) => void;
  scale?: number;
  connectionEdges?: {
    j1: Array<{ from: string; to: string }>;
    j2: Array<{ from: string; to: string }>;
  };
}

type Point3D = { x: number; y: number; z: number };
type Point2D = { x: number; y: number; depth: number };
type Rotation = { x: number; y: number };

const VERTICES: [Point3D, Point3D, Point3D, Point3D] = [
  { x: 0, y: -1.18, z: 0.06 },
  { x: -1.06, y: 0.74, z: 0.8 },
  { x: 1.06, y: 0.74, z: 0.8 },
  { x: 0, y: 0.74, z: -1.08 },
];

const FACE_DEFINITIONS = [
  { id: "A", zeroKey: "a", vertices: [1, 2, 3] as const },
  { id: "B", zeroKey: "b", vertices: [0, 2, 3] as const },
  { id: "C", zeroKey: "c", vertices: [0, 1, 3] as const },
  { id: "D", zeroKey: "d", vertices: [0, 1, 2] as const },
];

const FACE_VIEWS: Array<{ id: string; label: string; rotation: Rotation }> = [
  { id: "A", label: "Cara A", rotation: { x: -20, y: 30 } },
  { id: "B", label: "Cara B", rotation: { x: -16, y: 122 } },
  { id: "C", label: "Cara C", rotation: { x: -16, y: -122 } },
  { id: "D", label: "Cara D", rotation: { x: 62, y: 0 } },
];

const INITIAL_ROTATION: Rotation = FACE_VIEWS[0].rotation;

function parseTetraPosition(position: string) {
  const parts = position.replace(/[()]/g, "").split(",").map((value) => Number(value.trim()));
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid tetra position: ${position}`);
  }

  return { a: parts[0], b: parts[1], c: parts[2], d: parts[3] };
}

function computeSize(hexData: HexData[]) {
  const first = hexData[0];
  if (!first) return 4;
  const coords = parseTetraPosition(first.position);
  return coords.a + coords.b + coords.c + coords.d + 1;
}

function barycentricPoint(a: number, b: number, c: number, d: number, total: number): Point3D {
  const wa = a / total;
  const wb = b / total;
  const wc = c / total;
  const wd = d / total;

  return {
    x: wa * VERTICES[0].x + wb * VERTICES[1].x + wc * VERTICES[2].x + wd * VERTICES[3].x,
    y: wa * VERTICES[0].y + wb * VERTICES[1].y + wc * VERTICES[2].y + wd * VERTICES[3].y,
    z: wa * VERTICES[0].z + wb * VERTICES[1].z + wc * VERTICES[2].z + wd * VERTICES[3].z,
  };
}

function rotatePoint(point: Point3D, rotation: Rotation): Point3D {
  const radX = (rotation.x * Math.PI) / 180;
  const radY = (rotation.y * Math.PI) / 180;

  const cosX = Math.cos(radX);
  const sinX = Math.sin(radX);
  const cosY = Math.cos(radY);
  const sinY = Math.sin(radY);

  const y1 = point.y * cosX - point.z * sinX;
  const z1 = point.y * sinX + point.z * cosX;

  const x2 = point.x * cosY + z1 * sinY;
  const z2 = -point.x * sinY + z1 * cosY;

  return { x: x2, y: y1, z: z2 };
}

function projectPoint(point: Point3D, scale: number): Point2D {
  const cameraDistance = 4.6;
  const perspective = cameraDistance / (cameraDistance - point.z);

  return {
    x: point.x * scale * perspective,
    y: point.y * scale * perspective,
    depth: point.z,
  };
}

const Triangle3D: React.FC<Triangle3DProps> = ({
  hexData,
  onHexClick,
  scale = 1,
  connectionEdges = { j1: [], j2: [] },
}) => {
  const [rotation, setRotation] = useState<Rotation>(INITIAL_ROTATION);
  const dragStateRef = useRef<{ x: number; y: number } | null>(null);

  const size = computeSize(hexData);
  const total = Math.max(1, size - 1);
  const sceneScale = 180 * scale;
  const nodeSize = Math.max(22, 62 - size * 5);
  const faceNodeCount = (size * (size + 1)) / 2;

  const scene = useMemo(() => {
    const projectedMap = new Map<string, Point2D>();
    const cells = hexData
      .map((hex) => {
        const coords = parseTetraPosition(hex.position);
        const point = barycentricPoint(coords.a, coords.b, coords.c, coords.d, total);
        const rotated = rotatePoint(point, rotation);
        const projected = projectPoint(rotated, sceneScale);
        projectedMap.set(hex.position, projected);
        const zeroCount = [coords.a, coords.b, coords.c, coords.d].filter((value) => value === 0).length;

        return {
          ...hex,
          coords,
          projected,
          isSurface: zeroCount >= 1,
          isEdge: zeroCount >= 2,
          isVertex: zeroCount >= 3,
        };
      })
      .sort((left, right) => left.projected.depth - right.projected.depth);

    const faces = FACE_DEFINITIONS.map((face) => {
      const rotatedVertices = face.vertices.map((index) => rotatePoint(VERTICES[index], rotation));
      const projectedVertices = rotatedVertices.map((vertex) => projectPoint(vertex, sceneScale));
      const centroid = projectPoint(
        {
          x: rotatedVertices.reduce((sum, vertex) => sum + vertex.x, 0) / 3,
          y: rotatedVertices.reduce((sum, vertex) => sum + vertex.y, 0) / 3,
          z: rotatedVertices.reduce((sum, vertex) => sum + vertex.z, 0) / 3,
        },
        sceneScale * 0.94
      );

      return {
        ...face,
        points: projectedVertices,
        centroid,
        depth: rotatedVertices.reduce((sum, vertex) => sum + vertex.z, 0) / 3,
      };
    }).sort((left, right) => left.depth - right.depth);

    const buildSegments = (edges: Array<{ from: string; to: string }>) =>
      edges.map((edge) => {
        const start = projectedMap.get(edge.from);
        const end = projectedMap.get(edge.to);
        if (!start || !end) return null;
        return { start, end };
      }).filter((segment): segment is { start: Point2D; end: Point2D } => segment !== null);

      return {
      cells,
      faces,
      segments: {
        j1: buildSegments(connectionEdges.j1 || []),
        j2: buildSegments(connectionEdges.j2 || []),
      },
    };
  }, [connectionEdges.j1, connectionEdges.j2, hexData, rotation, sceneScale, total]);

  const nudgeRotation = (deltaX: number, deltaY: number) => {
    setRotation((current) => ({
      x: Math.max(-89, Math.min(89, current.x + deltaX)),
      y: current.y + deltaY,
    }));
  };

  const setFaceView = (nextRotation: Rotation) => {
    setRotation(nextRotation);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".tetra-node")) {
      dragStateRef.current = null;
      return;
    }
    dragStateRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const previous = dragStateRef.current;
    if (!previous) return;

    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;

    dragStateRef.current = { x: event.clientX, y: event.clientY };
    nudgeRotation(deltaY * 0.38, deltaX * 0.52);
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
  };

  return (
    <div className="tetra-stage">
      <div className="tetra-controls">
        <div className="tetra-controls-block">
          <span className="tetra-controls-title">Vista</span>
          <div className="tetra-face-pills">
            {FACE_VIEWS.map((face) => {
              const isActive =
                Math.abs(rotation.x - face.rotation.x) < 1.5 && Math.abs(rotation.y - face.rotation.y) < 2;

              return (
                <button
                  key={face.id}
                  type="button"
                  className={`tetra-pill ${isActive ? "active" : ""}`}
                  onClick={() => setFaceView(face.rotation)}
                >
                  {face.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tetra-controls-block tetra-controls-row">
          <button type="button" className="tetra-nav" onClick={() => nudgeRotation(0, -18)} aria-label="Girar a la izquierda">
            ←
          </button>
          <button type="button" className="tetra-nav" onClick={() => nudgeRotation(-14, 0)} aria-label="Girar hacia arriba">
            ↑
          </button>
          <button type="button" className="tetra-nav" onClick={() => nudgeRotation(14, 0)} aria-label="Girar hacia abajo">
            ↓
          </button>
          <button type="button" className="tetra-nav" onClick={() => nudgeRotation(0, 18)} aria-label="Girar a la derecha">
            →
          </button>
          <button type="button" className="tetra-reset" onClick={() => setFaceView(INITIAL_ROTATION)}>
            Reset
          </button>
        </div>

        <div className="tetra-controls-block tetra-hint">
          <span>Arrastra para rotar.</span>
          <span>Cada cara tiene {faceNodeCount} nodos visibles.</span>
        </div>
      </div>

      <div
        className="tetra-scene"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg className="tetra-faces" viewBox="-360 -320 720 640" aria-hidden="true">
          {scene.faces.map((face) => (
            <g key={face.id}>
              <polygon
                className={`tetra-face tetra-face-${face.id.toLowerCase()}`}
                points={face.points.map((point) => `${point.x},${point.y}`).join(" ")}
              />
              <text className="tetra-face-label" x={face.centroid.x} y={face.centroid.y}>
                {face.id}
              </text>
            </g>
          ))}

          {scene.segments.j1.map((segment, index) => (
            <line
              key={`j1-line-${index}`}
              className="tetra-link tetra-link-j1"
              x1={segment.start.x}
              y1={segment.start.y}
              x2={segment.end.x}
              y2={segment.end.y}
            />
          ))}

          {scene.segments.j2.map((segment, index) => (
            <line
              key={`j2-line-${index}`}
              className="tetra-link tetra-link-j2"
              x1={segment.start.x}
              y1={segment.start.y}
              x2={segment.end.x}
              y2={segment.end.y}
            />
          ))}
        </svg>

        <div className="tetra-node-layer">
          {scene.cells.map((cell) => {
            const sizeMultiplier = cell.isVertex ? 1.08 : cell.isEdge ? 1.02 : cell.isSurface ? 1 : 0.76;
            const finalSize = Math.round(nodeSize * sizeMultiplier);

            return (
              <button
                key={cell.position}
                type="button"
                className={`tetra-node ${cell.player ?? "empty"} ${cell.isSurface ? "surface" : "inner"}`}
                style={{
                  width: finalSize,
                  height: finalSize,
                  left: `calc(50% + ${cell.projected.x}px)`,
                  top: `calc(50% + ${cell.projected.y}px)`,
                  zIndex: `${Math.round(200 + cell.projected.depth * 100)}`,
                  ["--node-size" as string]: `${finalSize}px`,
                }}
                onClick={() => onHexClick(cell.position)}
                disabled={!!cell.player}
                aria-label={`Nodo tetraedrico ${cell.position}`}
                title={cell.position}
              >
                <span className="tetra-node-core" />
                <span className="tetra-node-shadow" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Triangle3D;
