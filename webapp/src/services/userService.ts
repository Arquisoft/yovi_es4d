import { post } from './api';
import { API_URL } from '../config';
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

export interface HistoryResponse {
  games: BackendGameRecord[];
  pagination: {
    page: number;
    limit: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
  summary: {
    totalGames: number;
    totalWins: number;
    totalDraws: number;
    totalLosses: number;
    winPercentage: number;
  };
}

export type HistoryResult = HistoryResponse | BackendGameRecord[];

export const getHistory = async (
  userId?: string,
  page = 1,
  sortBy: 'date' | 'moves' = 'date',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<HistoryResult> => {
  const res = await axios.get(`${API_URL}/api/game/history`, {
    params: { userId, page, sortBy, sortOrder },
    withCredentials: true,
  });

  return res.data;
};

export const login = async (credentials: {email: string, password: string}) => {
  const response = await axios.post(`${API_URL}/login`, credentials,{
    withCredentials: true
  });
  return response.data;
};

export const register = async (userData: any) => {
  try {
    const response = await axios.post(`${API_URL}/adduser`, userData,{
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const getProfile = async () => {
  const res = await fetch(`${API_URL}/api/user/getUserProfile`, {
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
