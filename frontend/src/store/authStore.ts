import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setAuthLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAuthLoading: true,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },
      setAuthLoading: (loading) => {
        set({ isAuthLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (_state, _error) => {
        // Use setTimeout to ensure the store is fully initialized before updating
        setTimeout(() => {
          useAuthStore.getState().setAuthLoading(false);
        }, 0);
      },
    }
  )
);