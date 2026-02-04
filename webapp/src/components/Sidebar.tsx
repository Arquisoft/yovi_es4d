import './StartScreen.css';

export default function Sidebar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h3 className="navbar-title">yovi_es4d</h3>
      </div>

      <ul className="navbar-menu">
        <li><button className="navbar-button">Idioma</button></li>
        <li><button className="navbar-button">Reglas</button></li>
        <li><button className="navbar-button">Perfil</button></li>
        <li><button className="navbar-button">Cerrar sesión</button></li>
      </ul>
    </nav>
  );
}
