import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useTranslation } from '../i18n';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="page-container">
      <LoginForm />
      <p>
       {t("users.account")} <Link to="/register">{t("users.register")}</Link>
      </p>
    </div>
  );
};

export default LoginPage;
