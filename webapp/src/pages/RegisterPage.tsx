import React from 'react';
import { Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import { useTranslation } from '../i18n';
import Sidebar from '../components/Sidebar';

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Sidebar />
      <div className="page-container">
        <div className="auth-card">
          <RegisterForm />
          <p className="auth-switch">
            {t("users.haveaccount")} <Link to="/login">{t("users.login")}</Link>
          </p>
        </div>
        
        <footer className="start-footer">
          <a href='https://github.com/Arquisoft/yovi_es4d/tree/master' id = 'github-link' ><p>{t('footer.credits')}</p></a>
        </footer>
      </div>
    </>
    
  );
};

export default RegisterPage;
