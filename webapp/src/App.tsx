import './components/StartScreen.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StartScreen from './components/StartScreen';
import Rules from './components/Rules';
import ScreenGame from './components/game/GameBoard';
import GameOver from './components/GameOver';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from "./pages/Dashboard";
import { RouterProvider } from 'react-router-dom';
import router from './routers/index';
function App() {
  return <RouterProvider router={router} />;
}

export default App;
