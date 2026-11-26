import { create } from 'zustand';
import { bindTokenGetter } from '@/lib/api';

type AuthState = {
  accessToken: string | null;
  setToken: (t: string | null) => void;
  loadFromStorage: () => void;
  clear: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  accessToken: null,
  setToken: (t) => {
    if (t) {
      localStorage.setItem('accessToken', t);
    } else {
      localStorage.removeItem('accessToken');
    }
    set({ accessToken: t });
  },
  loadFromStorage: () => {
    const t = localStorage.getItem('accessToken');
    set({ accessToken: t });
  },
  clear: () => {
    localStorage.removeItem('accessToken');
    set({ accessToken: null });
  },
}));

// Bind interceptor getter
bindTokenGetter(() => useAuth.getState().accessToken);

