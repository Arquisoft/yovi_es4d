import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext.tsx';
import { useTranslation } from '../i18n';
import './Historial.css';
import { getHistory } from '../services/userService.ts';
import type { BackendGameRecord, HistoryResponse, HistoryResult } from '../services/userService.ts';

type SortType = 'date' | 'moves';
type SortOrder = 'asc' | 'desc';

const COLORS = ['#4caf50', '#f44336', '#9e9e9e'];

const buildSummaryFromGames = (games: BackendGameRecord[]): HistoryResponse['summary'] => {
  const totalGames = games.length;
  const totalWins = games.filter((game) => game.winner === 'j1').length;
  const totalDraws = games.filter((game) => !game.winner).length;
  const totalLosses = totalGames - totalWins - totalDraws;

  return {
    totalGames,
    totalWins,
    totalDraws,
    totalLosses,
    winPercentage: totalGames ? Math.round((totalWins / totalGames) * 100) : 0,
  };
};

const normalizeHistory = (
  result: HistoryResult,
  currentPage: number
): HistoryResponse => {
  if (Array.isArray(result)) {
    return {
      games: result,
      pagination: {
        page: currentPage,
        limit: 5,
        hasPrev: currentPage > 1,
        hasNext: false,
      },
      summary: buildSummaryFromGames(result),
    };
  }

  return result;
};

const Historial: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [history, setHistory] = useState<BackendGameRecord[]>([]);
  const [pagination, setPagination] = useState<HistoryResponse['pagination']>({
    page: 1,
    limit: 5,
    hasPrev: false,
    hasNext: false,
  });
  const [summary, setSummary] = useState<HistoryResponse['summary']>({
    totalGames: 0,
    totalWins: 0,
    totalDraws: 0,
    totalLosses: 0,
    winPercentage: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id || user?.userId || user?._id;
    if (!userId) {
      navigate('/login');
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getHistory(userId, currentPage, sortBy, sortOrder);
        const res = normalizeHistory(result, currentPage);
        setHistory(Array.isArray(res.games) ? res.games : []);
        setPagination(res.pagination);
        setSummary(res.summary);
      } catch (err) {
        console.error(err);
        setError('Error al cargar historial');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, currentPage, sortBy, sortOrder, navigate]);

  const chartData = [
    { name: 'Victorias', value: summary.totalWins },
    { name: 'Derrotas', value: summary.totalLosses },
    { name: 'Empates', value: summary.totalDraws },
  ];

  const getOpponentName = (game: BackendGameRecord) => {
    const opponent = game.players.find((player) => player.role === 'j2');
    return opponent?.username || opponent?.name || 'Oponente desconocido';
  };

  const getWinnerName = (game: BackendGameRecord) => {
    if (!game.winner) return t('historial.draw');

    const winner = game.players.find((player) => player.role === game.winner);

    return (
      winner?.username ||
      winner?.name ||
      (game.winner === 'j1' ? t('historial.player') : t('historial.opponent'))
    );
  };

  const handleSort = (type: SortType) => {
    if (sortBy === type) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
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
            Fecha {sortBy === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>

          <button onClick={() => handleSort('moves')}>
            Nº de Movimientos {sortBy === 'moves' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>

        {error && (
          <div
            style={{
              color: '#d32f2f',
              padding: 12,
              marginBottom: 16,
              backgroundColor: '#ffebee',
              borderRadius: 4,
            }}
          >
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
                  <strong>{t('historial.totalGames')}</strong> {summary.totalGames}
                </div>
                <div>
                  <strong>{t('historial.totalWins')}</strong> {summary.totalWins}
                </div>
                <div>
                  <strong>{t('historial.winPct')}</strong> {summary.winPercentage}%
                </div>
              </div>

              {summary.totalGames > 0 && (
                <div
                  style={{
                    width: '100%',
                    height: '300px',
                    minHeight: '300px',
                    display: 'flex',
                    justifyContent: 'center',
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
                        <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index]} />
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
                    {history.map((game) => (
                      <li
                        key={game._id || game.gameId}
                        style={{
                          border: '1px solid #eee',
                          padding: 12,
                          marginBottom: 12,
                          borderRadius: 4,
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 16,
                          }}
                        >
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

                  <div className="pagination">
                    <button
                      onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                      disabled={!pagination.hasPrev}
                    >
                      ⇦
                    </button>
                    <span>{t('friends.page')} {pagination.page}</span>
                    <button
                      onClick={() => {
                        if (pagination.hasNext) {
                          setCurrentPage((page) => page + 1);
                        }
                      }}
                      disabled={!pagination.hasNext}
                    >
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