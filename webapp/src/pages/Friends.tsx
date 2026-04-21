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
import type { ExploreUsersResponse } from '../services/friendService';
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
  const [explorePagination, setExplorePagination] = useState<ExploreUsersResponse['pagination']>({
    page: 1,
    limit: 10,
    hasPrev: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?._id || user?.id || user?.userId;
    if (!userId) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, tab, search, page, navigate]);

  const loadData = async () => {
    const userId = user?._id || user?.id || user?.userId;
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (tab === 'explore') {
        const res = await exploreUsers(search, page);
        setData(Array.isArray(res.users) ? res.users : []);
        setExplorePagination(res.pagination);
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

  const handleSend = async (id: string) => {
    try {
      await sendFriendRequest(id);
      loadData();
    } catch {
      setError(t('friends.errorSend'));
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      loadData();
    } catch {
      setError(t('friends.errorAccept'));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectFriendRequest(id);
      loadData();
    } catch {
      setError(t('friends.errorReject'));
    }
  };

  if (user === undefined) {
    return <div className="loading-message">{t('back.loading')}</div>;
  }

  return (
    <>
      <Sidebar />
      <div className="friends-page">
        <header>
          <h1>{t('friends.title')}</h1>
        </header>

        <div className="tabs">
          <button onClick={() => { setTab('explore'); setPage(1); }} className={tab === 'explore' ? 'active' : ''}>
            {t('friends.tabs.explore')}
          </button>
          <button onClick={() => { setTab('friends'); setPage(1); }} className={tab === 'friends' ? 'active' : ''}>
            {t('friends.tabs.friends')}
          </button>
          <button onClick={() => { setTab('requests'); setPage(1); }} className={tab === 'requests' ? 'active' : ''}>
            {t('friends.tabs.requests')}
          </button>
        </div>

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

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-message">{t('friends.loadingUser')}</div>
        ) : (
          <>
            <ul className="friends-list">
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

            {tab === 'explore' && (
              <div className="pagination">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={!explorePagination.hasPrev}
                >
                  ⇦
                </button>
                <span>{t('friends.page')} {page}</span>
                <button
                  onClick={() => {
                    if (explorePagination.hasNext) {
                      setPage((p) => p + 1);
                    }
                  }}
                  disabled={!explorePagination.hasNext}
                >
                  ⇨
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Friends;
