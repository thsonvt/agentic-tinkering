import React, {createContext, useContext, ReactNode} from 'react';
import {ConvexReactClient, useQuery, useConvexAuth} from 'convex/react';
import {ConvexAuthProvider, useAuthActions} from '@convex-dev/auth/react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {api} from '../../convex/_generated/api';

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

// Internal provider that uses Convex hooks
function AuthContextInner({children}: {children: ReactNode}) {
  const {isLoading, isAuthenticated} = useConvexAuth();
  const {signOut} = useAuthActions();
  const viewer = useQuery(api.users.viewer);

  const user: User | null =
    isAuthenticated && viewer
      ? {
          email: viewer.email || '',
          user_metadata: {
            full_name: viewer.name,
          },
        }
      : null;

  const login = () => {
    window.location.href = '/login';
  };

  const logout = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider value={{user, isLoading, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

// Singleton client outside component to persist across renders
let convexClient: ConvexReactClient | null = null;

function getClient(url: string): ConvexReactClient {
  if (!convexClient) {
    convexClient = new ConvexReactClient(url);
  }
  return convexClient;
}

export function AuthProvider({children}: {children: ReactNode}) {
  const {siteConfig} = useDocusaurusContext();
  const {convexUrl} = siteConfig.customFields as {convexUrl?: string};

  // SSR check
  if (typeof window === 'undefined' || !convexUrl) {
    return (
      <AuthContext.Provider value={{user: null, isLoading: false, login: () => {}, logout: () => {}}}>
        {children}
      </AuthContext.Provider>
    );
  }

  const client = getClient(convexUrl);

  return (
    <ConvexAuthProvider client={client}>
      <AuthContextInner>{children}</AuthContextInner>
    </ConvexAuthProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
