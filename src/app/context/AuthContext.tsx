import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  signout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.getSession(token).then((response) => {
        if (response.user) {
          setUser({
            id: response.user.id,
            email: response.user.email,
            name: response.user.user_metadata?.name || response.user.email,
          });
          setAccessToken(token);
        } else {
          localStorage.removeItem('accessToken');
        }
        setLoading(false);
      }).catch(() => {
        localStorage.removeItem('accessToken');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const signin = async (email: string, password: string) => {
    const response = await api.signin(email, password);
    if (response.error) {
      throw new Error(response.error);
    }
    const token = response.session.access_token;
    setUser({
      id: response.user.id,
      email: response.user.email,
      name: response.user.user_metadata?.name || response.user.email,
    });
    setAccessToken(token);
    localStorage.setItem('accessToken', token);
  };

  const signup = async (email: string, password: string, name: string) => {
    const response = await api.signup(email, password, name);
    if (response.error) {
      throw new Error(response.error);
    }
    // Auto sign in after signup
    await signin(email, password);
  };

  const signout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, signin, signup, signout, loading }}>
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
