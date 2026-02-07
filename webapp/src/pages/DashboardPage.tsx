import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
    username: string;
    email: string;
}

const DashboardPage = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Intentamos obtener el usuario desde el backend usando la cookie
                const res = await fetch(`${API_URL}/api/users/me`, {
                    credentials: 'include', // 🔑 envía cookie HTTP-only
                });

                if (!res.ok) {
                    setUser(null); // no hay sesión
                } else {
                    const data: User = await res.json();
                    setUser(data);
                }
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const handleLogout = async () => {
        try {
            // Llama al backend para borrar la cookie
            await fetch(`${API_URL}/api/users/logout`, {
                method: 'POST',
                credentials: 'include',
            });
            setUser(null);
            window.location.href = '/login'; // redirige al login
        } catch (err) {
            console.error('Error al cerrar sesión:', err);
        }
    };

    if (loading) return <p>Cargando...</p>;
    if (!user) return <p>No estás loggeado. Por favor, haz login.</p>;

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Bienvenido, {user.username}!</h1>
            <p>Email: {user.email}</p>
            <button onClick={handleLogout} style={{ marginTop: '1rem' }}>
                Cerrar sesión
            </button>
        </div>
    );
};

export default DashboardPage;
