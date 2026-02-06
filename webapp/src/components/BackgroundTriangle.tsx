import React from "react";

interface BackgroundTriangleProps {
  width: number;
  height: number;
  color?: string;
}

export const BackgroundTriangle: React.FC<BackgroundTriangleProps> = ({
  width,
  height,
  color = "burlywood",
}) => {
  return (
    <div
      style={{
        width,
        height,
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        background: color,
        position: "absolute",
        top: 0,
        left: 0,
      }}
    />
  );
};
