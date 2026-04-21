import { API_URL } from '../config';

export const post = async (endpoint: string, data: any) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'Algo salio mal');
    }

    return responseData;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('No se pudo conectar con el gateway. Revisa que la URL del API use el protocolo correcto y que el servicio este levantado.');
    }
    throw error;
  }
};
