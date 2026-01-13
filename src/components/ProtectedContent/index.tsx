import React from 'react';
import {useAuth} from '@site/src/contexts/AuthContext';
import styles from './styles.module.css';

interface ProtectedContentProps {
  children: React.ReactNode;
}

export default function ProtectedContent({children}: ProtectedContentProps): React.ReactNode {
  const {user, isLoading, login} = useAuth();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <h2>Authentication Required</h2>
        <p>You need to be logged in to view this content.</p>
        <button onClick={login} className={styles.loginButton}>
          Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
