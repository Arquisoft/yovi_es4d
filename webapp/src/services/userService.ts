import { post } from './api';
import { API_URL } from '../config'; // API_URL apunta al gateway (http://localhost:8000)
import axios from "axios";

export interface Player {
  id?: string;
  userId?: string;
  username?: string;
  role: string; // "j1" or "j2"
  name?: string;
  color?: string;
  points?: number;
}

export interface BackendGameRecord {
  _id?: string;
  gameId: string;
  userId: string;
  gameMode: string;
  boardSize?: number;
  createdAt: string;
  finishedAt?: string;
  players: Player[];
  status: string;
  winner: string | null; 
  moves?: unknown[];
}

export const getHistory = async (userId?: string): Promise<BackendGameRecord[]> => {

  try {
    const queryString = `?userId=${userId}`;
    const res = await fetch(`${API_URL}/api/game/history${queryString}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      console.warn(`History request returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn('History response is not an array');
      return [];
    }
    return data as BackendGameRecord[];
  } catch (error) {
    console.error('Error fetching game history:', error);
    return [];
  }
};

export const login = async (credentials: {email: string, password: string}) => {
  const response = await axios.post(`${API_URL}/login`, credentials,{
    withCredentials: true
  });
  return response.data;
};

export const register = async (userData: any) => {
  try {
    const response = await axios.post(
      `${API_URL}/adduser`,
      userData,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
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
  const res = await fetch(`${API_URL}/logout`, {
    method: 'POST',
    credentials: "include",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error("Error al cerrar sesión");
  return res.json();
};