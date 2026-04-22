import React, { useEffect, useState } from "react";
import { getProfile } from '../services/userService';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n";

const Dashboard: React.FC = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await getProfile();
                setName(data.username);
                setEmail(data.email);
            } catch (error) {
                console.error("El usuario no está autenticado", error);
                navigate("/login", { replace: true });
            }
        };

        loadProfile();
    }, [navigate]);

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Dashboard</h1>
                <div className="user-info">
                    <p>{t("users.welcome", name)}</p>
                    <p>{t("users.email", email)}</p>
                    <button onClick={() => navigate('/game')}>{t("users.game")}</button>
                </div>
            </header>

            <main className="dashboard-content">
                <h2>{t("users.panel")}</h2>
                <p>{t("users.auth")}</p>
                <p>{t("users.session")}</p>
            </main>
        </div>
    );
};

export default Dashboard;
