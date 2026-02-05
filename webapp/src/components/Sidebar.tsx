import './StartScreen.css';
import { useTranslation } from '../i18n';

export default function Sidebar() {
  const { t, lang, setLang } = useTranslation();

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
        <li><button className="navbar-button">{t('menu.rules')}</button></li>
        <li><button className="navbar-button">{t('menu.profile')}</button></li>
        <li><button className="navbar-button">{t('menu.logout')}</button></li>
      </ul>
    </nav>
  );
}
