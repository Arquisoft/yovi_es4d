import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useTranslation } from '../i18n';
import Sidebar from '../components/Sidebar';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Sidebar />
      <div className="page-container">
        <div className="auth-card">
          <LoginForm />
          <p>
            {t("users.account")} <Link to="/register">{t("users.register")}</Link>
          </p>
        </div>
        <footer className="start-footer">
          <a href='https://github.com/Arquisoft/yovi_es4d/tree/master' id = 'github-link' ><p>{t('footer.credits')}</p></a>
        </footer>
      </div>
    </>
  );
};

export default LoginPage;
