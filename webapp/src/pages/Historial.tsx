import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.tsx';
import { getHistory } from '../services/userService.ts';
import type { BackendGameRecord } from '../services/userService.ts';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router-dom';
import './Historial.css';
import Sidebar from '../components/Sidebar';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type SortType = 'date' | 'moves';
type SortOrder = 'asc' | 'desc';

const Historial: React.FC = () => {
  const [history, setHistory] = useState<BackendGameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [sortBy, setSortBy] = useState<SortType>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = user?.id || user?.userId || user?._id;

    if (!userId) {
      navigate('/login');
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await getHistory(userId);
        setHistory(data);
        setCurrentPage(1);
      } catch (err) {
        setError('Error al cargar historial');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, navigate]);

  const sortedHistory = [...history].sort((a, b) => {
    switch (sortBy) {
      case 'date': {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }

      case 'moves': {
        const movesA = a.moves?.length || 0;
        const movesB = b.moves?.length || 0;
        return sortOrder === 'asc' ? movesA - movesB : movesB - movesA;
      }
    }
  });

  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage);

  const paginatedHistory = sortedHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalGames = history.length;
  const totalWins = history.filter(h => h.winner === 'j1').length;
  const totalDraws = history.filter(h => !h.winner).length;
  const totalLosses = totalGames - totalWins - totalDraws;

  const winPercentage = totalGames
    ? Math.round((totalWins / totalGames) * 100)
    : 0;

  const chartData = [
    { name: 'Victorias', value: totalWins },
    { name: 'Derrotas', value: totalLosses },
    { name: 'Empates', value: totalDraws }
  ];

  const COLORS = ['#4caf50', '#f44336', '#9e9e9e'];

  const getOpponentName = (game: BackendGameRecord) => {
    const opponent = game.players.find(p => p.role === 'j2');
    return opponent?.username || opponent?.name || 'Oponente desconocido';
  };

  const getWinnerName = (game: BackendGameRecord) => {
    if (!game.winner) return t('historial.draw');

    const winner = game.players.find(p => p.role === game.winner);

    return (
      winner?.username ||
      winner?.name ||
      (game.winner === 'j1'
        ? t('historial.player')
        : t('historial.opponent'))
    );
  };

  const handleSort = (type: SortType) => {
    if (sortBy === type) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  if (!user) return null;

  return (
    <>
      <Sidebar />

      <div className="historial-page">
        <header>
          <h1>{t('historial.title')}</h1>
        </header>

        <h2>Filtros</h2>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => handleSort('date')}>
            Fecha {sortBy === 'date' ? (sortOrder === 'asc' ? '⇧' : '⇩') : ''}
          </button>

          <button onClick={() => handleSort('moves')}>
            Nº de Movimientos {sortBy === 'moves' ? (sortOrder === 'asc' ? '⇧' : '⇩') : ''}
          </button>
        </div>

        {error && (
          <div style={{
            color: '#d32f2f',
            padding: 12,
            marginBottom: 16,
            backgroundColor: '#ffebee',
            borderRadius: 4
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            {t('historial.loading')}
          </div>
        ) : (
          <>

            <section
              className="historial-summary"
              style={{ border: '1px solid #ddd', padding: 12, marginBottom: 16 }}
            >
              <h2>{t('historial.summary')}</h2>

              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <strong>{t('historial.totalGames')}</strong> {totalGames}
                </div>
                <div>
                  <strong>{t('historial.totalWins')}</strong> {totalWins}
                </div>
                <div>
                  <strong>{t('historial.winPct')}</strong> {winPercentage}%
                </div>
              </div>

              {/* PIE CHART */}
              {totalGames > 0 && (
                  <div
                    style={{
                      width: '100%',
                      height: '300px',
                      minHeight: '300px',
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    <PieChart width={400} height={300}>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>

                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </div>
)}
            </section>

            <section className="historial-list">
              <h2>{t('historial.games')}</h2>

              {history.length === 0 ? (
                <p>{t('historial.noGames')}</p>
              ) : (
                <>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {paginatedHistory.map(game => (
                      <li
                        key={game._id || game.gameId}
                        style={{
                          border: '1px solid #eee',
                          padding: 12,
                          marginBottom: 12,
                          borderRadius: 4
                        }}
                      >
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 16
                        }}>
                          <div>
                            <div>
                              <strong>{t('historial.date')}</strong>{' '}
                              {new Date(game.createdAt).toLocaleString('es-ES')}
                            </div>

                            <div>
                              <strong>{t('historial.opponent')}</strong>{' '}
                              {getOpponentName(game)}
                            </div>
                          </div>

                          <div>
                            <div>
                              <strong>{t('historial.result')}</strong>{' '}
                              {getWinnerName(game)}
                            </div>

                            <div>
                              <strong>{t('historial.mode')}</strong> {game.gameMode}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <details>
                            <summary>{t('historial.moves')}</summary>

                            <div style={{ marginTop: 8 }}>
                              <div><strong>Tablero:</strong> {game.boardSize}</div>
                              <div><strong>Estado:</strong> {game.status}</div>

                              {game.moves?.length ? (
                                <div>{game.moves.length} movimientos</div>
                              ) : (
                                <div>{t('historial.movesNotAvailable')}</div>
                              )}
                            </div>
                          </details>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}>
                      ⇦
                    </button>

                    <span>Página {currentPage} / {totalPages || 1}</span>

                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}>
                      ⇨
                    </button>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        <div className="action-row">
          <button onClick={() => navigate('/')}>
            {t('startScreen.goback')}
          </button>
        </div>
      </div>
    </>
  );
};

export default Historial;