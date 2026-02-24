import React, { useState } from 'react';
import { register } from '../services/userService';
import { useTranslation } from '../i18n';

const RegisterForm: React.FC = () => {
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
  // Chequea que tenga al menos un carácter antes del @,
  // seguido de un dominio con un punto y algo después
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasNoSpaces = !/\s/.test(password);
    return hasUpperCase && hasNumber && hasNoSpaces && password.length >= minLength;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // ✅ Validaciones frontend
    if (!username || username.length < 3) {
      setError(t('registerForm.errorUsername'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('registerForm.errorEmail'));
      return;
    }

    if (!validatePassword(password)) {
      setError(t('registerForm.errorPasswordContent'));
      return;
    }

    if (password !== repassword) {
      setError(t('registerForm.errorPasswordMatch'));
      return;
    }

    setLoading(true);

    try {
      await register({ username, email, password }); // llama al gateway
      setSuccess(true);
      setUsername('');
      setEmail('');
      setPassword('');
      setRepassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{t("registerForm.title")}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="username">{t("registerForm.username")}:</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">{t("registerForm.email")}:</label>
          <input
            id="email"
            type="text"
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
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="repassword">{t("registerForm.repassword")}:</label>
          <input
            id="repassword"
            type="password"
            value={repassword}
            onChange={(e) => setRepassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? t("registerForm.loading") : t("registerForm.register")}
        </button>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{t("registerForm.success")}</p>}
      </form>
    </div>
  );
};

export default RegisterForm;