import './StartScreen.css';
import { useTranslation } from '../i18n';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();

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
        <li><button className="navbar-button">{t('menu.profile')}</button></li>
        <li><button className="navbar-button" onClick={() => navigate('/logout')}>{t('menu.logout')}</button></li>
      </ul>
    </nav>
  );
}
