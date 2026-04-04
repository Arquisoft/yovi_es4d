import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";

interface Profile {
  username: string;
  avatar: string;
}

const UserHeader: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/user/getUserProfile`, { method: "POST", credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setProfile({ username: data.username, avatar: data.avatar }); })
      .catch(() => {});
  }, []);

  return (
    <div
      className="w-full flex items-center justify-between px-5 py-2"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        minHeight: "48px",
      }}
    >
      {/* Botón inicio */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
        style={{ background: "none", border: "none", padding: 0, color: "var(--subtle)", cursor: "pointer" }}
      >
        <span style={{ fontSize: "1rem" }}>←</span>
        <span>Inicio</span>
      </button>

      {/* Info del usuario */}
      {profile && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
            {profile.username}
          </span>
          <div
            className="rounded-full overflow-hidden flex-shrink-0"
            style={{ width: 30, height: 30, border: "2px solid var(--violet)" }}
          >
            <img
              src={profile.avatar}
              alt={profile.username}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserHeader;
