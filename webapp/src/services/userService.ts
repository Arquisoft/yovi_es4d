import { post } from './api';
import { API_URL } from '../config'; // API_URL apunta al gateway (http://localhost:8000)

export const login = async (userData: any) => {
  return await post(`${API_URL}/login`, userData); // gateway login
};

export const register = async (userData: any) => {
  return await post('/adduser', userData); // gateway adduser
};

export const getProfile = async () => {
  const res = await fetch(`${API_URL}/api/users/getUserProfile`, {
    method: 'POST',
    credentials: "include",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error("No autenticado");
  return res.json();
};

export const logout = async () => {
  const res = await fetch(`${API_URL}/api/users/logout`, {
    method: 'POST',
    credentials: "include",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error("Error al cerrar sesión");
  return res.json();
};