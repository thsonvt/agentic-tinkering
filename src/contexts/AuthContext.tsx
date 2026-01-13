import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {getSupabaseClient} from '@site/src/lib/supabase';
import type {User as SupabaseUser, SupabaseClient} from '@supabase/supabase-js';

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

function mapSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;
  return {
    email: supabaseUser.email || '',
    user_metadata: {
      full_name: supabaseUser.user_metadata?.full_name,
    },
  };
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const {siteConfig} = useDocusaurusContext();

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const {supabaseUrl, supabaseAnonKey} = siteConfig.customFields as {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };

    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    if (!client) {
      setIsLoading(false);
      return;
    }

    setSupabase(client);

    // Get initial session
    client.auth.getSession().then(({data: {session}}) => {
      setUser(mapSupabaseUser(session?.user ?? null));
      setIsLoading(false);
    });

    // Listen for auth changes
    const {data: {subscription}} = client.auth.onAuthStateChange((_event, session) => {
      setUser(mapSupabaseUser(session?.user ?? null));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [siteConfig.customFields]);

  const login = async () => {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return;
    }

    const email = window.prompt('Enter your email:');
    if (!email) return;

    const {error} = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(`Login error: ${error.message}`);
    } else {
      alert('Check your email for a login link!');
    }
  };

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
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
