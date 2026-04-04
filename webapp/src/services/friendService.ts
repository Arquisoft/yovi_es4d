import axios from 'axios';
import { API_URL } from '../config';

export interface User {
  _id: string;
  username: string;
  avatar?: string;
}

// Solicitud de amistad
export interface Request {
  _id: string;
  status: string;
  sender: User;
  receiver: User;
  createdAt: string;
}

// Explorar usuarios
export const exploreUsers = async (search = '', page = 1): Promise<User[]> => {
  const res = await axios.get(`${API_URL}/api/friends/explore`, {
    params: { search, page },
    withCredentials: true,
  });
  return res.data.users;
};

// Obtener amigos
export const getFriends = async (search = '', page = 1): Promise<User[]> => {
  const res = await axios.get(`${API_URL}/api/friends`, {
    params: { search, page },
    withCredentials: true,
  });
  return res.data;
};

// Solicitudes recibidas
export const getFriendRequests = async (): Promise<Request[]> => {
  const res = await axios.get(`${API_URL}/api/friends/requests`, {
    params: { type: 'received' },
    withCredentials: true,
  });
  return res.data;
};

// Enviar solicitud
export const sendFriendRequest = async (receiverId: string): Promise<any> => {
  const res = await axios.post(
    `${API_URL}/api/friends/request`,
    { receiverId },
    { withCredentials: true }
  );
  return res.data;
};

// Aceptar solicitud
export const acceptFriendRequest = async (requestId: string): Promise<any> => {
  const res = await axios.patch(
    `${API_URL}/api/friends/accept`,
    { requestId },
    { withCredentials: true }
  );
  return res.data;
};

// Rechazar solicitud
export const rejectFriendRequest = async (requestId: string): Promise<any> => {
  const res = await axios.patch(
    `${API_URL}/api/friends/reject`,
    { requestId },
    { withCredentials: true }
  );
  return res.data;
};