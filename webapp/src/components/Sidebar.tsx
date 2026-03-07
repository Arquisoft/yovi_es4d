import './StartScreen.css';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.tsx';

export default function Sidebar() {
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  console.log('Sidebar renderizado. Usuario');
  console.log('user es: ' ,user);
  const handleAuthClick = () => {
    if (user) {
      // Si hay sesión → cerrar sesión
      logout();
      console.log('Sesión cerrada');
    } else {
      // Si no hay sesión → ir a login
      navigate('/login');
      console.log('Redirigiendo a login');
    }
  };
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h3 className="navbar-title">{t('menu.team')}</h3>
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
            <option className='en-select'value="en">{t('menu.english')}</option>
          </select>
        </li>
        <li><button className="navbar-button" onClick={() => navigate('/rules')}>{t('menu.rules')}</button></li>
        <li><button className="navbar-button" onClick={() => navigate('/edit')}>{t('menu.profile')}</button></li>
        <li><button className="navbar-button" onClick={() => navigate('/historial')}>{t('menu.historial')}</button></li>
        
        <li><button className="navbar-button" onClick={handleAuthClick}>{user ? t('menu.logout') : t('menu.initsession')}</button></li>
      </ul>
    </nav>
  );
}
