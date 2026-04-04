import { Navigate, createBrowserRouter } from "react-router-dom";
import StartScreen from "../components/StartScreen";
import Rules from "../components/Rules";
import ScreenGame from "../components/game/GameBoard";
import GameOver from "../components/GameOver";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import Dashboard from "../pages/Dashboard";
import EditProfile from "../pages/EditProfilePage";
import Historial from "../pages/Historial";
import ModeSelector from "../components/game/ModeSelector";
import OnlineLobby from "../components/game/Onlinelobby";
import Friends  from "../pages/Friends";
import Notifications from "../components/Notifications";



const router = createBrowserRouter([
  {
    path: "/",
    element: <StartScreen />,
  },
  {
    path: "/rules",
    element: <Rules />,
  },
  {
    path: "/game",
    element: <ScreenGame />,
  },
  {
    path: "/gameover",
    element: <GameOver />,
  },
  {
    path: "/login",
    element: <LoginPage />,
           
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },{
    path: "/edit",
    element: <EditProfile />,
  },
  {
    path: "/historial",
    element: <Historial />,
  },
  {
    path: "/select",
    element: <ModeSelector />
  },
  {
    path: "/online-lobby",
    element: <OnlineLobby  />
  },
  {
    path: "/friends",
    element: <Friends /> 
  },
  {
    path: "/notifications",
    element: <Notifications />
  }

]);

export default router;