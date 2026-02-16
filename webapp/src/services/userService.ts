import { post } from './api';

import { API_URL } from '../config';

export const login = async (userData: any) => {
  return await post('/api/users/login', userData);
};

export const register = async (userData: any) => {
  return await post('/api/users/register', userData);
};


export const getProfile = async () => {

  `${API_URL}/api/users/getUserProfile`
  const res = await fetch(`${API_URL}/api/users/getUserProfile`, {
    method: 'POST',
    credentials: "include",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error("No autenticado");
  }

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

  if (!res.ok) {
    throw new Error("Error al cerrar sesión");
  }

  return res.json();
};
