import React, { useRef, useState, useEffect } from "react";

interface TriangleCProps {
  children?: React.ReactNode;
  extraScale?: number; // porcentaje extra, default 1.2 = 20%
}

const TriangleC: React.FC<TriangleCProps> = ({ children, extraScale = 0.9 }) => {
  const childRef = useRef<HTMLDivElement>(null);
  const [childSize, setChildSize] = useState({ width: 0, height: 0 });

  // Observa cambios de tamaño del hijo
  useEffect(() => {
    if (!childRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setChildSize({ width, height });
      }
    });

    observer.observe(childRef.current);

    return () => observer.disconnect();
  }, [children]);

  const containerWidth = childSize.width ? childSize.width * extraScale : "auto";
  const containerHeight = childSize.height ? childSize.height * extraScale : "auto";

  const offsetX = typeof containerWidth === "number" ? (containerWidth - childSize.width) / 2 : 0;
  const offsetY = typeof containerHeight === "number" ? (containerHeight - childSize.height) / 2 : 0;

  return (
    <div
      style={{
        width: containerWidth,
        height: containerHeight,
        position: "relative",
        margin: "0 auto",
        overflow: "hidden",
      }}
    >
      <div
        ref={childRef}
        style={{
          position: "absolute",
          left: offsetX,
          top: offsetY,
        
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default TriangleC;
