import React from "react";
import "./game.css";

interface HexagonProps {
    width: number;
    height: number;
    left: number;
    top: number;
    position: string;
    player?: "j1" | "j2" | null;
    onClick: () => void;
}

const Hexagon: React.FC<HexagonProps> = ({
                                             width, height, left, top, position, player, onClick,
                                         }) => {
    const cls = ["hex-cell", player ?? ""].filter(Boolean).join(" ");

    return (
        <button
            className={cls}
            style={{ width, height, left, top, position: "absolute" }}
            onClick={onClick}
            disabled={!!player}
            data-position={position}
        />
    );
};

export default Hexagon;