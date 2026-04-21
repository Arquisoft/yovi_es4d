import React, { useContext, useState } from 'react';
import { login } from '../services/userService';
import { useNavigate } from "react-router-dom";
import { useTranslation } from '../i18n';
import { AuthContext } from "../context/AuthContext";


const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { checkAuth } = useContext(AuthContext);

const validateEmail = (email: string) => {
  if (email.length > 254) return false;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errorEmail =
    t('registerForm.errorEmail') === 'registerForm.errorEmail'
      ? 'Correo electrónico no válido'
      : t('registerForm.errorEmail');

    const errorPassword =
      t('registerForm.errorPasswordContent') === 'registerForm.errorPasswordContent'
        ? 'Contraseña es obligatoria'
        : t('registerForm.errorPasswordContent');

    if (!email) {
      setError(errorEmail);
      return;
    }
    if (!validateEmail(email)) {
      setError(errorEmail);
      return;
    }
    if (!password) {
      setError(errorPassword);
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      await checkAuth(); // Actualiza el contexto con la nueva sesión
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Login failed');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{t("menu.initsession")}</h2>
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="email">{t("registerForm.email")}:</label>
          <input
            id="email"
            type="email"
            placeholder={t("registerForm.enterEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">{t("registerForm.password")}:</label>
          <input
            id="password"
            type="password"
            value={password}
            placeholder={t("registerForm.enterPassword")}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? t("registerForm.loading") : t("registerForm.enter")}
        </button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default LoginForm;
