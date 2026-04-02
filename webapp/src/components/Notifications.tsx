import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { API_URL } from '../config';
import './StartScreen.css';

interface RelatedUser {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface Notification {
  _id: string;
  type: string;
  read: boolean;
  createdAt: string;
  relatedUser: RelatedUser;
  requestId?: string; // ⚠️ necesario para aceptar/rechazar
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // 🔹 Función para cargar notificaciones
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/notifications`, { withCredentials: true });
      if (res.data && Array.isArray(res.data.notifications)) {
        setNotifications(res.data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🔹 Manejar aceptar solicitud
  const handleAccept = async (notification: Notification) => {
    if (!notification.requestId) return;
    try {
      await axios.patch(
        `${API_URL}/api/friends/accept`,
        { requestId: notification.requestId },
        { withCredentials: true }
      );
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError('Error aceptando solicitud');
    }
  };

  // 🔹 Manejar rechazar solicitud
  const handleReject = async (notification: Notification) => {
    if (!notification.requestId) return;
    try {
      await axios.patch(
        `${API_URL}/api/friends/reject`,
        { requestId: notification.requestId },
        { withCredentials: true }
      );
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError('Error rechazando solicitud');
    }
  };

  return (
    <>
      <Sidebar />
      <div className="start-screen">
        <main className="main-content">
          <div className="content-inner">
            <h1>Notificaciones</h1>

            {loading && <p style={{ color: 'white', textAlign: 'center' }}>Cargando notificaciones...</p>}
            {error && <p style={{ color: 'white', textAlign: 'center' }}>{error}</p>}

            {!loading && !error && (
              <div className="notifications-content rules-content">
                {notifications.length === 0 ? (
                  <p>No tienes notificaciones</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id} className={`notification-card ${!n.read ? 'unread' : ''}`}>
                      <img
                        src={n.relatedUser.avatar || '/default-avatar.png'}
                        alt={n.relatedUser.username}
                        className="avatar"
                      />
                      <div className="notification-text">
                        <p>
                          <strong>{n.relatedUser.username}</strong> te ha enviado una solicitud de amistad
                        </p>
                        <small>{new Date(n.createdAt).toLocaleString()}</small>
                      </div>
                      <button onClick={() => handleAccept(n)}>Aceptar</button>
                      <button onClick={() => handleReject(n)}>Rechazar</button>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="action-row">
              <button className="play-button" onClick={() => navigate('/')}>
                Volver
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Notifications;