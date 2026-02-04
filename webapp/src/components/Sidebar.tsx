import './StartScreen.css';

type Props = {
  open: boolean;
  onToggle: () => void;
};

export default function Sidebar({ open, onToggle }: Props) {
  return (
    <aside className={`sidebar ${open ? 'open' : 'collapsed'}`} aria-hidden={!open}>
      <div className="sidebar-header">
        <h3 className="sidebar-title">{open ? 'Menú' : 'M'}</h3>
        <button className="collapse-btn" onClick={onToggle} aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>
          {open ? '‹' : '›'}
        </button>
      </div>

      <ul className="menu-list">
        <li><button className="menu-button">Cerrar sesión</button></li>
      </ul>
    </aside>
  );
}
