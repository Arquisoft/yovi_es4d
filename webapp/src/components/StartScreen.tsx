import Sidebar from './Sidebar';
import Typing from './Typing';
import './StartScreen.css';

export default function StartScreen() {
  return (
    <>
      <Sidebar />

      <div className="start-screen">
        <main className="main-content">
          <div className="content-inner">
            <h1>¡Bienvenido a yovi_es4d!</h1>
            <p>Disfruta el clásico juego Y</p>

            <div className="action-row">
              <button className="play-button">Jugar</button>
            </div>

            <div className="typing-holder" aria-hidden={false}>
              <Typing text="¡Hola! Somos los desarrolladores del juego yovi_es4d, Andrea 🫡, Jorge 🧊, Sara 🐦‍🔥 y Sergio ◻️. ¡Espero que te lo pases muy bien!" speed={40} tag="h2" />
            </div>
          </div>
        </main>
      </div>

      <footer className="start-footer">
        <p>© 2026 yovi_es4d. Todos los derechos reservados.</p>
      </footer>
    </>
  ); 
}
