import './components/StartScreen.css';
import { RouterProvider } from 'react-router-dom';
import router from './routers/index';
function App() {
  return <RouterProvider router={router} />;
}

export default App;
