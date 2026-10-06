import { createContext, useContext } from 'react';

/* Admin auth: view-only unless logged in (the server enforces it too). */
export const TOKEN_KEY = 'adminToken';

export const AuthContext = createContext<{ isAdmin: boolean; save: (body: object) => Promise<void> }>({
  isAdmin: false,
  save: async () => {},
});

export const useAuth = () => useContext(AuthContext);
