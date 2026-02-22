import Sidebar from './Sidebar';
import Typing from './Typing';
import './StartScreen.css';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router-dom'; 

export default function StartScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
 const handlePlayClick = () => {
    navigate('/game');
  };
  return (
    <>
      <Sidebar />

      <div className="start-screen">
        <main className="main-content">
          <div className="content-inner">
            <h1>{t('startScreen.title')}</h1>
            <h2>{t('startScreen.subtitle')}</h2>

            <div className="action-row">
              <button className="play-button" onClick={handlePlayClick}>
                {t('startScreen.play')}</button>
            </div>
            <div
              className="typing-holder"
              aria-hidden={false}
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                left: 'auto',
                transform: 'none',
                bottom: 'auto',
                marginTop: '12px',
                pointerEvents: 'none'
              }}
            >
              <Typing text={t('startScreen.typing')} speed={40} tag="h2" />
            </div>
          </div>
        </main>
      </div>

      <footer className="start-footer">
        <a href='https://github.com/Arquisoft/yovi_es4d/tree/master' id = 'github-link' ><p>{t('footer.credits')}</p></a>
      </footer>
    </>
  ); 
}
