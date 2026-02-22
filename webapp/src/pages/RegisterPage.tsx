import React from 'react';
import { Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import { useTranslation } from '../i18n';

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="page-container">
      <RegisterForm />
      <p>
        {t("users.haveaccount")} <Link to="/login">{t("users.login")}</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
