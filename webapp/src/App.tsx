import './components/StartScreen.css';
import './App.css':
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StartScreen from './components/StartScreen';
import Rules from './components/Rules';
import ScreenGame from './components/game/GameBoard';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/game" element={<Rules />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
