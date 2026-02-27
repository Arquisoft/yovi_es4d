import { post } from './api';
import { API_URL } from '../config'; // API_URL apunta al gateway (http://localhost:8000)
import axios from "axios";


export const login = async (credentials: {email: string, password: string}) => {
  const response = await axios.post(`${API_URL}/login`, credentials);
  return response.data;
};

export const register = async (userData: any) => {
  try {
    const response = await axios.post(`${API_URL}/adduser`, userData);
    return response.data;
  } catch (error) {
    console.log(error);
  }
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