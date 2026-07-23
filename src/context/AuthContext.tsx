import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { STORAGE_KEYS, loadLocalData, saveLocalData } from '../lib/supabase';
import { INITIAL_USERS } from '../data/initialData';
import { logAuditEvent } from '../lib/audit';

interface AuthContextType {
  user: UserProfile | null;
  usersList: UserProfile[];
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; mustChangePassword?: boolean; message?: string }>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<boolean>;
  createUser: (newUser: Omit<UserProfile, 'id' | 'createdAt'>) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<boolean>;
  toggleUserActive: (userId: string) => Promise<boolean>;
  hasPermission: (requiredRole: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<UserProfile[]>(() =>
    loadLocalData<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS)
  );

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    saveLocalData(STORAGE_KEYS.USERS, usersList);
  }, [usersList]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [user]);

  const isAuthenticated = Boolean(user);

  const login = async (email: string, pass: string) => {
    const found = usersList.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) {
      return { success: false, message: 'Usuário não encontrado. Verifique o e-mail informado.' };
    }

    if (!found.active) {
      return { success: false, message: 'Usuário desativado. Entre em contato com o Usuário Mestre.' };
    }

    const expectedPassword = found.password || 'pioneirosdacolina2026';

    if (pass !== expectedPassword) {
      return { success: false, message: 'Senha incorreta. Verifique a senha digitada.' };
    }

    const updatedUser: UserProfile = { ...found, lastLoginAt: new Date().toISOString() };

    const updatedUsersList = usersList.map((u) => (u.id === found.id ? updatedUser : u));
    setUsersList(updatedUsersList);
    setUser(updatedUser);

    logAuditEvent(found.id, found.name, 'LOGIN_SISTEMA', 'auth', 'Login efetuado com sucesso');

    return {
      success: true,
      mustChangePassword: Boolean(found.mustChangePassword)
    };
  };

  const logout = () => {
    if (user) {
      logAuditEvent(user.id, user.name, 'LOGOUT_SISTEMA', 'auth', 'Logout do sistema realizado');
    }
    setUser(null);
  };

  const changePassword = async (newPassword: string) => {
    if (!user) return false;

    const updatedCurrentUser: UserProfile = {
      ...user,
      password: newPassword,
      mustChangePassword: false
    };

    const updatedUsers = usersList.map((u) => {
      if (u.id === user.id) {
        return updatedCurrentUser;
      }
      return u;
    });

    setUsersList(updatedUsers);
    setUser(updatedCurrentUser);
    saveLocalData(STORAGE_KEYS.USERS, updatedUsers);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedCurrentUser));

    logAuditEvent(user.id, user.name, 'TROCA_SENHA', 'auth', 'Senha alterada com sucesso');
    return true;
  };

  const createUser = async (newUser: Omit<UserProfile, 'id' | 'createdAt'>) => {
    if (!user) return false;
    const created: UserProfile = {
      ...newUser,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const nextList = [...usersList, created];
    setUsersList(nextList);
    logAuditEvent(user.id, user.name, 'CRIAR_USUARIO', 'users', `Novo usuário criado: ${created.name} (${created.role})`, {
      resourceId: created.id
    });
    return true;
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!user || user.role !== 'master') return false; // Only master can edit roles
    const target = usersList.find((u) => u.id === userId);
    if (!target) return false;

    if (target.email === 'pioneirosdacolina@desbravadores.com' && newRole !== 'master') {
      return false; // Prevent removing master role from primary master account
    }

    const nextList = usersList.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    setUsersList(nextList);
    logAuditEvent(user.id, user.name, 'ALTERAR_PERFIL_USUARIO', 'users', `Perfil de ${target.name} alterado para ${newRole}`, {
      resourceId: userId,
      oldValues: { role: target.role },
      newValues: { role: newRole }
    });
    return true;
  };

  const toggleUserActive = async (userId: string) => {
    if (!user || user.role !== 'master') return false;
    const target = usersList.find((u) => u.id === userId);
    if (!target) return false;

    if (target.email === 'pioneirosdacolina@desbravadores.com') return false; // Cannot deactivate master

    const nextList = usersList.map((u) => (u.id === userId ? { ...u, active: !u.active } : u));
    setUsersList(nextList);
    logAuditEvent(user.id, user.name, 'ALTERAR_STATUS_USUARIO', 'users', `Status de ${target.name} alterado para ${!target.active ? 'Ativo' : 'Inativo'}`);
    return true;
  };

  const hasPermission = (requiredRole: UserRole | UserRole[]) => {
    if (!user) return false;
    if (user.role === 'master') return true; // Master has full permissions
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usersList,
        isAuthenticated,
        login,
        logout,
        changePassword,
        createUser,
        updateUserRole,
        toggleUserActive,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro do AuthProvider');
  }
  return context;
};
