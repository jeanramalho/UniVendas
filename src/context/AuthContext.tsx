import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured, STORAGE_KEYS, loadLocalData, saveLocalData } from '../lib/supabase';
import {
  fetchProfileByEmailFromSupabase,
  fetchProfileByIdFromSupabase,
  fetchProfilesFromSupabase,
  saveUserToSupabase
} from '../lib/supabaseDb';
import { logAuditEvent } from '../lib/audit';

interface AuthContextType {
  user: UserProfile | null;
  usersList: UserProfile[];
  isAuthenticated: boolean;
  authLoading: boolean;
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
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const cachedUsers = loadLocalData<UserProfile[]>(STORAGE_KEYS.USERS, []);
      const cachedCurrentUser = loadLocalData<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
      setUsersList(cachedUsers);
      setUser(cachedCurrentUser);
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    const loadSession = async () => {
      const [{ data: sessionData }, profiles] = await Promise.all([
        supabase.auth.getSession(),
        fetchProfilesFromSupabase()
      ]);

      if (!mounted) return;

      if (profiles) {
        setUsersList(profiles);
      }

      const sessionUser = sessionData.session?.user;
      if (sessionUser) {
        const profile =
          (profiles || []).find((item) => item.id === sessionUser.id) ||
          (await fetchProfileByIdFromSupabase(sessionUser.id)) ||
          (await fetchProfileByEmailFromSupabase(sessionUser.email || ''));

        if (profile && profile.active !== false) {
          setUser(profile);
        } else {
          setUser(null);
        }
      }

      setAuthLoading(false);
    };

    void loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      const profile =
        (await fetchProfileByIdFromSupabase(session.user.id)) ||
        (await fetchProfileByEmailFromSupabase(session.user.email || ''));

      if (profile && profile.active !== false) {
        setUser(profile);
        const profiles = await fetchProfilesFromSupabase();
        if (profiles) {
          setUsersList(profiles);
        }
      } else {
        setUser(null);
      }

      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = Boolean(user);

  const login = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase não está configurado no projeto.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass
    });

    if (error || !data.session?.user) {
      return { success: false, message: error?.message || 'Falha ao autenticar no Supabase.' };
    }

    const authUser = data.session.user;
    const profile =
      (await fetchProfileByIdFromSupabase(authUser.id)) ||
      (await fetchProfileByEmailFromSupabase(authUser.email || ''));

    if (!profile) {
      return { success: false, message: 'Perfil administrativo não encontrado para o usuário autenticado.' };
    }

    if (!profile.active) {
      await supabase.auth.signOut();
      return { success: false, message: 'Usuário desativado. Entre em contato com o Usuário Mestre.' };
    }

    const updatedUser: UserProfile = { ...profile, lastLoginAt: new Date().toISOString() };
    setUser(updatedUser);
    setUsersList((prev) => {
      const exists = prev.some((item) => item.id === updatedUser.id);
      return exists ? prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)) : [updatedUser, ...prev];
    });

    void saveUserToSupabase(updatedUser);
    logAuditEvent(updatedUser.id, updatedUser.name, 'LOGIN_SISTEMA', 'auth', 'Login efetuado com sucesso');

    return {
      success: true,
      mustChangePassword: Boolean(updatedUser.mustChangePassword)
    };
  };

  const logout = () => {
    if (user) {
      logAuditEvent(user.id, user.name, 'LOGOUT_SISTEMA', 'auth', 'Logout do sistema realizado');
    }
    void supabase.auth.signOut();
    setUser(null);
  };

  const changePassword = async (newPassword: string) => {
    if (!user || !isSupabaseConfigured) return false;

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return false;
    }

    const updatedCurrentUser: UserProfile = {
      ...user,
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
    void saveUserToSupabase(updatedCurrentUser);
    saveLocalData(STORAGE_KEYS.USERS, updatedUsers);

    logAuditEvent(user.id, user.name, 'TROCA_SENHA', 'auth', 'Senha alterada com sucesso');
    return true;
  };

  const createUser = async (newUser: Omit<UserProfile, 'id' | 'createdAt'>) => {
    if (!user) return false;
    const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
    const created: UserProfile = {
      ...newUser,
      id: generatedId,
      createdAt: new Date().toISOString()
    };
    const nextList = [...usersList, created];
    setUsersList(nextList);
    void saveUserToSupabase(created);
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
        authLoading,
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
