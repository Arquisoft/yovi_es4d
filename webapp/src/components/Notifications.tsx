import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
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
  requestId?: string;
}

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/notifications`, { withCredentials: true });
      if (res.data && Array.isArray(res.data.notifications)) {
        setNotifications(res.data.notifications);
        console.log('Notificaciones cargadas:', res.data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      console.error('Error cargando notificaciones:', err.response?.data || err.message);
      setError(t('notifications.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

 

  return (
    <>
      <Sidebar />
      <div className="start-screen">
        <main className="main-content">
          <div className="content-inner">
            <h1>{t('notifications.title')}</h1>

            {loading && <p style={{ color: 'white', textAlign: 'center' }}>{t('notifications.loading')}</p>}
            {error && <p style={{ color: 'white', textAlign: 'center' }}>{error}</p>}

            {!loading && !error && (
              <div className="notifications-content rules-content">
                {notifications.length === 0 ? (
                  <p>{t('notifications.empty')}</p>
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
                          <strong>{n.relatedUser.username}</strong> {t('notifications.friendRequest')}
                        </p>
                        <small>{new Date(n.createdAt).toLocaleString()}</small>
                      </div>
                     
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="action-row">
              <button className="play-button" onClick={() => navigate('/')}>
                {t('common.back')}
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Notifications;