import React, { useState } from 'react';
import { login } from '../services/userService';
import { useNavigate } from "react-router-dom";
import { useTranslation } from '../i18n';



const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{t("menu.initsession")}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
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
