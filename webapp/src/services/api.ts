const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const post = async (endpoint: string, data: any) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'Algo salió mal');
    }

    return responseData;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('No se pudo conectar con el servidor. Asegúrate de que el microservicio de usuarios esté corriendo.');
    }
    throw error;
  }
};
