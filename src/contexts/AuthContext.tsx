import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';

interface User {
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [netlifyIdentity, setNetlifyIdentity] = useState<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    import('netlify-identity-widget').then((identity) => {
      identity.init();
      setNetlifyIdentity(identity);

      const currentUser = identity.currentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      setIsLoading(false);

      identity.on('login', (loggedInUser: User) => {
        setUser(loggedInUser);
        identity.close();
      });

      identity.on('logout', () => {
        setUser(null);
      });
    });
  }, []);

  const login = () => {
    if (netlifyIdentity) {
      netlifyIdentity.open('login');
    }
  };

  const logout = () => {
    if (netlifyIdentity) {
      netlifyIdentity.logout();
    }
  };

  return (
    <AuthContext.Provider value={{user, isLoading, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
