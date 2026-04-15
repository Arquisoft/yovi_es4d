import React, { useState } from 'react';
import { register } from '../services/userService';
import { useTranslation } from '../i18n';
import { useNavigate } from "react-router-dom";

const RegisterForm: React.FC = () => {
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const validatePasswordMatch = (pwd: string, confirm: string) => {
    return pwd === confirm;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const errorUsername = t('registerForm.errorUsername') || 'Username must be at least 3 characters';
    const errorEmail = t('registerForm.errorEmail') || 'Invalid email';
    const errorPassword = t('registerForm.errorPasswordContent') || 'Password must have at least 8 characters, one uppercase and one number, and no spaces';
    const errorPasswordMatch = t('registerForm.errorPasswordMatch') || 'Passwords do not match';

    if (!username || username.length < 3) {
      setError(errorUsername);
      return;
    }

    if (!validateEmail(email)) {
      setError(errorEmail);
      return;
    }

    if (!validatePassword(password)) {
      setError(errorPassword);
      return;
    }

    if (!validatePasswordMatch(password, repassword)) {
      setError(errorPasswordMatch);
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
      navigate("/login");
    } catch (err: any) {
        if (err.response?.status === 409) {
          setError(t("registerForm.emailExists"));
        } else {
          setError(
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            "Registration failed"
          );
        }
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
            data-testid="password-input"
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
            data-testid="repassword-input"
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