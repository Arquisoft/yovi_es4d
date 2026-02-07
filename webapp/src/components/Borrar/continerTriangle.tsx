import React, { useRef, useState, useEffect } from "react";
import "./TriangleContiner.css";

interface TriangleCProps {
  children?: React.ReactNode;
  extraScale?: number; // porcentaje extra, default 1.1 = 10%
}

const TriangleC: React.FC<TriangleCProps> = ({ children, extraScale = 1.2 }) => {
  const childRef = useRef<HTMLDivElement>(null);
  const [childSize, setChildSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      setChildSize({ width: rect.width, height: rect.height });
    }
  }, [children]);

  const containerWidth = childSize.width * extraScale || "auto";
  const containerHeight = childSize.height * extraScale || "auto";

  // Calcular desplazamiento para centrar al hijo
  const offsetX = (containerWidth as number - childSize.width) / 2;
  const offsetY = (containerHeight as number - childSize.height) /2 ;

  return (
    <div
      style={{
        width: containerWidth,
        height: containerHeight,
        background: "burlywood",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        position: "relative",
        margin: "0 auto",
      }}
    >
      <div
        ref={childRef}
        style={{
          position: "absolute",
          left: offsetX,
          top: offsetY + 20,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default TriangleC;
