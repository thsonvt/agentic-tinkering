import React from 'react';
import {useAuth} from '@site/src/contexts/AuthContext';
import styles from './styles.module.css';

export default function AuthButton(): React.ReactNode {
  const {user, isLoading, login, logout} = useAuth();

  if (isLoading) {
    return null;
  }

  if (user) {
    return (
      <div className={styles.authContainer}>
        <span className={styles.userName}>
          {user.user_metadata?.full_name || user.email}
        </span>
        <button onClick={logout} className={styles.authButton}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <button onClick={login} className={styles.authButton}>
      Login
    </button>
  );
}
