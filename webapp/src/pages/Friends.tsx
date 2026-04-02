import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
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
      setError('Error cargando datos');
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
      setError('Error enviando solicitud');
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      loadData();
    } catch {
      setError('Error aceptando solicitud');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectFriendRequest(id);
      loadData();
    } catch {
      setError('Error rechazando solicitud');
    }
  };

  // ----------------------
  // RENDER
  // ----------------------
  if (user === undefined) return <div className="loading-message">Cargando usuario...</div>;

  return (
    <>
      <Sidebar />
      <div className="friends-page">
        <header>
          <h1>Amigos</h1>
        </header>

        {/* TABS */}
        <div className="tabs">
          <button onClick={() => setTab('explore')} className={tab === 'explore' ? 'active' : ''}>
            Explorar
          </button>
          <button onClick={() => setTab('friends')} className={tab === 'friends' ? 'active' : ''}>
            Mis Amigos
          </button>
          <button onClick={() => setTab('requests')} className={tab === 'requests' ? 'active' : ''}>
            Solicitudes
          </button>
        </div>

        {/* BUSCADOR */}
        {tab !== 'requests' && (
          <input
            type="text"
            placeholder="Buscar usuario..."
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
          <div className="loading-message">Cargando...</div>
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
                      <button onClick={() => handleSend(u._id)}>Añadir</button>
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
                      <button onClick={() => handleAccept(r._id)}>Aceptar</button>
                      <button onClick={() => handleReject(r._id)}>Rechazar</button>
                    </div>
                  </li>
                ))}
            </ul>
              {!loading && tab !== 'requests' && data.length === 0 && (
                <div className="empty-message">
                  No hay usuarios nuevos 😅
                </div>
              )}
              {!loading && tab === 'requests' && requests.length === 0 && (
                <div className="empty-message">
                  No tienes solicitudes pendientes 👍
                </div>
              )}
            {/* PAGINACIÓN */}
            {tab !== 'requests' && (
              <div className="pagination">
                <button onClick={() => setPage((p) => Math.max(p - 1, 1))}>⇦</button>
                <span>Página {page}</span>
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