import { create } from 'zustand';
import { UserRole } from '../types';

interface UserState {
  currentUser: string;
  currentRole: UserRole;
  setCurrentUser: (user: string) => void;
  setCurrentRole: (role: UserRole) => void;
}

// Get initial values from localStorage to preserve current operational settings
const initialUser = localStorage.getItem('current_user') || 'Admin';
const initialRole = (localStorage.getItem('current_role') as UserRole) || UserRole.Admin;

export const useUserStore = create<UserState>((set) => ({
  currentUser: initialUser,
  currentRole: initialRole,
  
  setCurrentUser: (user) => set(() => {
    localStorage.setItem('current_user', user);
    return { currentUser: user };
  }),
  
  setCurrentRole: (role) => set(() => {
    localStorage.setItem('current_role', role);
    return { currentRole: role };
  }),
}));
