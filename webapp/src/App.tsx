import './components/StartScreen.css';
//import RegisterForm from './RegisterForm';
//import reactLogo from './assets/react.svg';
import StartScreen from './components/StartScreen';

function App() {
  return (
    <div className="App">
      {/* Comentado para que funcione solo la pantalla de inicio por ahora, se cambiará más adelante */}
      {/* 
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h2>Welcome to the Software Arquitecture 2025-2026 course</h2>
      <RegisterForm />
      */}
      <StartScreen />
    </div>
  );
}

export default App;
