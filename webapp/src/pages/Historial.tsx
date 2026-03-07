import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.tsx';
import { getHistory } from '../services/userService.ts';
import type { BackendGameRecord } from '../services/userService.ts';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router-dom';
import './Historial.css';
import Sidebar from '../components/Sidebar';

const Historial: React.FC = () => {
  const [history, setHistory] = useState<BackendGameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        setError('Error al cargar historial');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, navigate]);

  const totalGames = history.length;
  const totalWins = history.filter(h => h.winner === 'j1').length;
  const winPercentage = totalGames ? Math.round((totalWins / totalGames) * 100) : 0;

  const getOpponentName = (game: BackendGameRecord) => {
    const opponent = game.players.find(p => p.role === 'j2');
    return opponent?.username || opponent?.name || 'Oponente desconocido';
  };

  const getWinnerName = (game: BackendGameRecord) => {
    if (!game.winner) return t('historial.draw');
    const winner = game.players.find(p => p.role === game.winner);
    return winner?.username || winner?.name || (game.winner === 'j1' ? t('historial.player') : t('historial.opponent'));
  };

  if (!user) return null;

  return (
    <>
    <Sidebar />
    <div className="historial-page">
      <header>
        <h1>{t('historial.title')}</h1>
      </header>

      {error && (
        <div style={{color: '#d32f2f', padding: 12, marginBottom: 16, backgroundColor: '#ffebee', borderRadius: 4}}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{textAlign: 'center', padding: 20}}>{t('historial.loading')}</div>
      ) : (
        <>
          <section className="historial-summary" style={{border: '1px solid #ddd', padding: 12, marginBottom: 16}}>
            <h2>{t('historial.summary')}</h2>
            <div style={{display: 'flex', gap: 16}}>
              <div><strong>{t('historial.totalGames')}</strong> {totalGames}</div>
              <div><strong>{t('historial.totalWins')}</strong> {totalWins}</div>
              <div><strong>{t('historial.winPct')}</strong> {winPercentage}%</div>
            </div>
          </section>

          <section className="historial-list">
            <h2>{t('historial.games')}</h2>

            {history.length === 0 ? (
              <p>{t('historial.noGames')}</p>
            ) : (
              <ul style={{listStyle: 'none', padding: 0}}>
                {history.map(game => (
                  <li key={game._id || game.gameId} style={{border: '1px solid #eee', padding: 12, marginBottom: 12, borderRadius: 4}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                      <div>
                        <div><strong>{t('historial.date')}</strong> {new Date(game.createdAt).toLocaleString('es-ES')}</div>
                        <div><strong>{t('historial.opponent')}</strong> {getOpponentName(game)}</div>
                      </div>

                      <div>
                        <div><strong>{t('historial.result')}</strong> {getWinnerName(game)}</div>
                        <div><strong>{t('historial.mode')}</strong> {game.gameMode}</div>
                      </div>
                    </div>

                    <div style={{marginTop: 12}}>
                      <details style={{cursor: 'pointer'}}>
                        <summary style={{fontWeight: 'bold'}}>{t('historial.moves')}</summary>
                        <div style={{marginTop: 8, paddingTop: 8, borderTop: '1px solid #eee'}}>
                          <div><strong>Tablero:</strong> {game.boardSize} casillas</div>
                          <div><strong>Estado:</strong> {game.status}</div>

                          {game.moves && game.moves.length > 0 ? (
                            <div><strong>{t('historial.moves')}</strong> {game.moves.length} registrados</div>
                          ) : (
                            <div style={{color: '#666', fontStyle: 'italic'}}>{t('historial.movesNotAvailable')}</div>
                          )}
                        </div>
                      </details>
                    </div>

                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <div className="action-row">
              <button className="play-button" onClick={() => navigate('/')}>
                {t('startScreen.goback')}
              </button>
      </div>

    </div>
    
    
    <footer className="start-footer">
        <a href='https://github.com/Arquisoft/yovi_es4d/tree/master' id = 'github-link' ><p>{t('footer.credits')}</p></a>
    </footer>

    </>
  );
};

export default Historial;