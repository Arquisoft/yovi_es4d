import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useTranslation } from '../i18n';
import {
  exploreUsers,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest
} from '../services/friendService';
import './Friends.css';

type User = {
  _id: string;
  username: string;
  avatar?: string;
};

type Request = {
  _id: string;
  sender: User;
  receiver: User;
};

const Friends: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [tab, setTab] = useState<'explore' | 'friends' | 'requests'>('explore');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<User[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
     
    if (!user) return; // usuario no cargado todavía
    const userId = user?._id || user?.id || user?.userId;
    if (!userId) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, tab, search, page, navigate]);

  const loadData = async () => {
    const userId = user?._id || user?.id || user?.userId;
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);

      if (tab === 'explore') {
        const res = await exploreUsers(search, page);
        setData(Array.isArray(res) ? res : []);
      } else if (tab === 'friends') {
        const res = await getFriends(search, page);
        setData(Array.isArray(res) ? res : []);
      } else if (tab === 'requests') {
        const res = await getFriendRequests();
        setRequests(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      console.error(err);
      setError(t('friends.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  // ----------------------
  // ACCIONES
  // ----------------------
  const handleSend = async (id: string) => {
    try {
      await sendFriendRequest(id);
      loadData();
    } catch {
      setError(t('friends.errorSending'));
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      loadData();
    } catch {
      setError(t('friends.errorAccepting'));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectFriendRequest(id);
      loadData();
    } catch {
      setError(t('friends.errorRejecting'));
    }
  };

  // ----------------------
  // RENDER
  // ----------------------
  if (user === undefined) return <div className="loading-message">{t('back')}</div>;

  return (
    <>
      <Sidebar />
      <div className="friends-page">
        <header>
          <h1>{t('friends.title')}</h1>
        </header>

        {/* TABS */}
        <div className="tabs">
          <button onClick={() => setTab('explore')} className={tab === 'explore' ? 'active' : ''}>
            {t('friends.tabs.explore')}
          </button>
          <button onClick={() => setTab('friends')} className={tab === 'friends' ? 'active' : ''}>
            {t('friends.tabs.friends')}
          </button>
          <button onClick={() => setTab('requests')} className={tab === 'requests' ? 'active' : ''}>
            {t('friends.tabs.requests')}
          </button>
        </div>

        {/* BUSCADOR */}
        {tab !== 'requests' && (
          <input
            type="text"
            placeholder={t('friends.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        )}

        {/* ERROR */}
        {error && <div className="error-message">{error}</div>}

        {/* LOADING */}
        {loading ? (
          <div className="loading-message">{t('friends.loadingUser')}</div>
        ) : (
          <>
            <ul className="friends-list">
              {/* EXPLORE / FRIENDS */}
              {tab !== 'requests' &&
                data.map((u) => (
                  <li key={u._id}>
                    <div>
                      <strong>{u.username}</strong>
                    </div>
                    {tab === 'explore' && (
                      <button onClick={() => handleSend(u._id)}>{t('friends.add')}</button>
                    )}
                  </li>
                ))}

              {/* REQUESTS */}
              {tab === 'requests' &&
                requests.map((r) => (
                  <li key={r._id}>
                    <div>
                      <strong>{r.sender.username}</strong>
                    </div>
                    <div className="actions">
                      <button onClick={() => handleAccept(r._id)}>{t('friends.accept')}</button>
                      <button onClick={() => handleReject(r._id)}>{t('friends.reject')}</button>
                    </div>
                  </li>
                ))}
            </ul>
              {!loading && tab !== 'requests' && data.length === 0 && (
                <div className="empty-message">
                  {t('friends.emptyExplore')}
                </div>
              )}
              {!loading && tab === 'requests' && requests.length === 0 && (
                <div className="empty-message">
                    {t('friends.emptyRequests')}
                </div>
              )}
            {/* PAGINACIÓN */}
            {tab !== 'requests' && (
              <div className="pagination">
                <button onClick={() => setPage((p) => Math.max(p - 1, 1))}>⇦</button>
                <span>{t('friends.page')} {page}</span>
                <button onClick={() => setPage((p) => p + 1)}>⇨</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Friends;