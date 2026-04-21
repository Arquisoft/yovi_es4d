import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useTranslation } from "../i18n";
import Sidebar from "../components/Sidebar";
import './EditProfilePage.css'; // <-- Nuevo CSS completo
import { useNavigate } from 'react-router-dom';

export default function EditUserPage() {
  const { t } = useTranslation();

  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
  loadProfile();
}, []);

const loadProfile = async () => {
  try {
    const res = await axios.post(
      `${API_URL}/api/user/getUserProfile`,
      {},
      { withCredentials: true }
    );

    setUser(res.data);
    setUsername(res.data.username);
  } catch (err: any) {
    if (err.response?.status === 401) {
      navigate("/login");
      return;
    }

    setError(err.response?.data || err.message);
  }
};

  const saveUsername = async () => {
    setError(null);
    setSuccess(null);

    if (username === user.username) {
    setError(t("editUser.usernameUnchanged"));
    return;
  }

    try {
      await axios.post(`${API_URL}/api/user/editUsername`, { username }, {
        withCredentials: true,
      });

      setSuccess(t("editUser.usernameUpdated"));
      loadProfile();
    } catch (err: any) {
      setError(err.response?.data || err.message);
    }
  };

  const changePassword = async () => {
  setError(null);
  setSuccess(null);

  if (!currentPassword.trim()) {
    setError(t("editUser.currentPasswordWrong"));
    return;
  }

  if (!newPassword.trim()) {
    setError(t("editUser.newPasswordRequired"));
    return;
  }

  if (newPassword !== confirmPassword) {
    setError(t("editUser.passwordMatch"));
    return;
  }

  try {
    await axios.post(
      `${API_URL}/api/user/changePassword`,
      { currentPassword, newPassword },
      { withCredentials: true }
    );

    setSuccess(t("editUser.passwordChanged"));

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

  } catch (err: any) {

    if (err.response?.status === 400 || err.response?.status === 401) {
      setError(t("editUser.currentPasswordWrong"));
      return;
    }

    setError(err.response?.data || err.message);
  }
};

  const updateAvatar = async () => {
  try {

    const res = await axios.post(
      `${API_URL}/api/user/updateAvatar`,
      {},
      { withCredentials: true }
    );

    setUser({
      ...user,
      avatar: res.data.avatar
    });

  } catch (err: any) {
    setError(err.response?.data || err.message);
  }
};
  if (!user) return <p style={{ textAlign: 'center', color: 'white', marginTop: '40px' }}>Loading...</p>;

  return (
    <>
      <Sidebar />
      <div className="edit-profile-page">
        <div className="edit-profile-card">

          <h2 className="auth-title">{t("editUser.title")}</h2>

          <div className="avatar-container">

            <img
              src={
                user.avatar ||
                `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.email}`
              }
              alt="avatar"
            />

            <button
              className="avatar-refresh"
              onClick={updateAvatar}
            >
              ⟳
            </button>

          </div>

          <label htmlFor="email-input">{t("editUser.email")}</label>
          <input
            id="email-input"
            value={user.email}
            disabled
          />

          <label htmlFor="username-input">{t("editUser.username")}</label>
          <input
            id = "username-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <button onClick={saveUsername}>
            {t("editUser.updateUsername")}
          </button>

          <hr />

          <label htmlFor="current-password-input" >{t("editUser.currentPassword")}</label>
          <input
            id = "current-password-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <label htmlFor="new-password-input">{t("editUser.newPassword")}</label>
          <input
            id = "new-password-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <label htmlFor="confirm-password-input">{t("editUser.confirmPassword")}</label>
          <input
            id = "confirm-password-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button onClick={changePassword}>
            {t("editUser.changePassword")}
          </button>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}


          <div className="action-row">
              <button className="play-button" onClick={() => navigate('/')}>
                {t('startScreen.goback')}
              </button>
          </div>

        </div>

      </div>

    </>
  );
}