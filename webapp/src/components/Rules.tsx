import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import './StartScreen.css';
import Sidebar from './Sidebar';

export default function Rules() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <Sidebar />
      <div className="start-screen">
        <main className="main-content">
          <div className="content-inner">
            <h1>{t('menu.rules')}</h1>
            <div className="rules-content">
              <p>{t('rules.description1')}</p>
              <p>{t('rules.description2')}</p>
              <p>{t('rules.description3')}</p>
              <p>{t('rules.description4')}</p>
              <p>{t('rules.wikipedia')}<a href="https://en.wikipedia.org/wiki/Y_(board_game)">{t('rules.wikipediaLink')}</a></p>
            </div>
            <div className="action-row">
              <button className="play-button" onClick={() => navigate('/')}>
                {t('startScreen.goback')}
              </button>
            </div>
          </div>
        </main>
      </div>
      <footer className="start-footer">
        <a href='https://github.com/Arquisoft/yovi_es4d/tree/master' id='github-link'>
          <p>{t('footer.credits')}</p>
        </a>
      </footer>
    </>
  );
}
