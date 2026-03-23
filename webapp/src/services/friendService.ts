import { API_URL } from '../config';

// 🔍 Explorar usuarios
export const exploreUsers = async (search = '', page = 1) => {
  const res = await fetch(
    `${API_URL}/api/friends/explore?search=${search}&page=${page}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (!res.ok) throw new Error('Error explorando usuarios');
  return res.json();
};

// 👥 Obtener amigos
export const getFriends = async (search = '', page = 1) => {
  const res = await fetch(
    `${API_URL}/api/friends?search=${search}&page=${page}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (!res.ok) throw new Error('Error obteniendo amigos');
  return res.json();
};

// 📩 Solicitudes recibidas
export const getFriendRequests = async () => {
  const res = await fetch(
    `${API_URL}/api/friends/requests?type=received`,
    {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (!res.ok) throw new Error('Error obteniendo solicitudes');
  return res.json();
};

// ➕ Enviar solicitud
export const sendFriendRequest = async (receiverId: string) => {
  const res = await fetch(`${API_URL}/api/friends/request`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiverId })
  });

  if (!res.ok) throw new Error('Error enviando solicitud');
  return res.json();
};

// ✅ Aceptar
export const acceptFriendRequest = async (requestId: string) => {
  const res = await fetch(`${API_URL}/api/friends/accept`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId })
  });

  if (!res.ok) throw new Error('Error aceptando');
  return res.json();
};

// ❌ Rechazar
export const rejectFriendRequest = async (requestId: string) => {
  const res = await fetch(`${API_URL}/api/friends/reject`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId })
  });

  if (!res.ok) throw new Error('Error rechazando');
  return res.json();
};