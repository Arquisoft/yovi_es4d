// src/components/Sidebar.tsx
import './StartScreen.css';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.tsx';

export default function Sidebar() {
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleAuthClick = () => {
    if (user) {
      logout();
      console.log('Sesión cerrada');
    } else {
      navigate('/login');
      console.log('Redirigiendo a login');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <button className="navbar-button" onClick={() => navigate('/')}>
            {t('menu.team')}
        </button>
      </div>

      <ul className="navbar-menu">
        <li>
          <select
            id="language-select"
            className="navbar-button navbar-select"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={t('menu.selectLanguage')}
          >
            <option className='es-select' value="es">{t('menu.spanish')}</option>
            <option className='en-select' value="en">{t('menu.english')}</option>
          </select>
        </li>

        <li>
          <button className="navbar-button" onClick={() => navigate('/rules')}>
            {t('menu.rules')}
          </button>
        </li>

        <li>
          <button className="navbar-button" onClick={() => navigate('/edit')}>
            {t('menu.profile')}
          </button>
        </li>

        <li>
          <button className="navbar-button" onClick={() => navigate('/historial')}>
            {t('menu.historial')}
          </button>
        </li>

        {/* Nuevo: Amigos */}
        <li>
          <button className="navbar-button" onClick={() => navigate('/friends')}>
            {t('menu.friends')}
          </button>
        </li>

        {/* Nuevo: Notificaciones (toggle) */}
        <li>
          <button className="navbar-button" onClick={() => navigate('/notifications')}>
            {t('menu.notification')}
          </button>
        </li>

        <li>
          <button className="navbar-button" onClick={handleAuthClick}>
            {user ? t('menu.logout') : t('menu.initsession')}
          </button>
        </li>
      </ul>

    </nav>
  );
}
