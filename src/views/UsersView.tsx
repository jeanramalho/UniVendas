import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Users, UserPlus, Shield, Lock, Key, CheckCircle2, X } from 'lucide-react';
import { logAuditEvent } from '../lib/audit';
import { supabase } from '../lib/supabase';

interface UsersViewProps {
  users: User[];
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  currentUserName: string;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  onAddUser,
  onUpdateUser,
  currentUserName
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [tempPassword, setTempPassword] = useState('Senha123!');
  const [errorMsg, setErrorMsg] = useState('');

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setErrorMsg('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          name,
          role
        }
      }
    });

    if (error) {
      setErrorMsg(error.message || 'Não foi possível criar o usuário no Supabase Auth.');
      return;
    }

    const authUserId = data.user?.id;

    const newUser: User = {
      id: authUserId || generateUUID(),
      name,
      email,
      role,
      active: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString()
    };

    onAddUser(newUser);
    logAuditEvent(
      'usr-current',
      currentUserName,
      'CRIAR_USUARIO_SISTEMA',
      'users',
      `Criado usuário ${name} (${role}) com e-mail ${email}`
    );

    setIsCreating(false);
    setName('');
    setEmail('');
    setTempPassword('Senha123!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#F97316]" />
            <span>Gestão de Usuários e Permissões do Sistema</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Controle de acessos com perfis: Master, Administrador e Operador de Balcão
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-1.5 bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário do Sistema</span>
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#111111] text-gray-300 font-semibold border-b border-[#2e2e2e]">
            <tr>
              <th className="p-3">Nome do Operador</th>
              <th className="p-3">E-mail de Acesso</th>
              <th className="p-3">Perfil / Nível</th>
              <th className="p-3">Troca de Senha Exigida?</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a] text-gray-300">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/5 transition">
                <td className="p-3 font-bold text-white">{u.name}</td>
                <td className="p-3 text-gray-300 font-mono">{u.email}</td>
                <td className="p-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      u.role === 'master'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : u.role === 'admin'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-3">
                  {u.mustChangePassword ? (
                    <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[10px]">
                      Sim (Pendente)
                    </span>
                  ) : (
                    <span className="text-gray-500 text-[10px]">Não</span>
                  )}
                </td>
                <td className="p-3">
                  {u.active ? (
                    <span className="text-emerald-400 font-bold">Ativo</span>
                  ) : (
                    <span className="text-red-400 font-bold">Inativo</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => {
                      onUpdateUser({ ...u, active: !u.active });
                    }}
                    className="text-xs bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded text-gray-300"
                  >
                    {u.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreate}
            className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white border-b border-[#2e2e2e] pb-3">
              Cadastrar Novo Usuário do Sistema
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">E-mail de Login *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] rounded-lg p-3">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Perfil de Acesso *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="operator">Operador de Vendas (Balcão)</option>
                <option value="admin">Administrador do Clube</option>
                <option value="master">Master (Acesso Total)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Senha Provisória (Troca Exigida no Primeiro Login)
              </label>
              <input
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-[#2e2e2e] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F97316] text-black font-bold text-xs rounded hover:bg-orange-400"
              >
                Criar Usuário
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
