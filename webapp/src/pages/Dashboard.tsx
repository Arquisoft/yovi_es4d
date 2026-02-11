import React, { useEffect, useState } from "react";
import { getProfile } from '../services/userService';

const Dashboard: React.FC = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await getProfile();
                setName(data.username);
                setEmail(data.email);
            } catch (error) {
                console.error("El usuario no está autenticado", error);
            }
        };

        loadProfile();
    }, []);




    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Dashboard</h1>
                <div className="user-info">
                    <p>Bienvenido, <strong>{name}</strong></p>
                    <p>Email: {email}</p>


                </div>
            </header>

            <main className="dashboard-content">
                <h2>Panel Principal</h2>
                <p>Estás autenticado correctamente.</p>
                <p>Tu sesión se mantiene automáticamente en todas las pestañas.</p>
            </main>
        </div>
    );
};

export default Dashboard;
