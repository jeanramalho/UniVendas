import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AppSettings } from '../types';
import { CLUB_LOGO_URL, DESBRAVADORES_LOGO_URL, INITIAL_SETTINGS } from '../data/initialData';

interface LoginViewProps {
  settings?: AppSettings;
}

export const LoginView: React.FC<LoginViewProps> = ({ settings = INITIAL_SETTINGS }) => {
  const { login, changePassword } = useAuth();
  const currentSettings = settings || INITIAL_SETTINGS;

  const [email, setEmail] = useState('pioneirosdacolina@desbravadores.com');
  const [password, setPassword] = useState('pioneirosdacolina2026');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Must change password step
  const [mustChange, setMustChange] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setErrorMsg(result.message || 'Erro ao efetuar login.');
      } else if (result.mustChangePassword) {
        setMustChange(true);
      }
    } catch (err) {
      setErrorMsg('Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPass !== confirmPass) {
      setErrorMsg('A confirmação de senha não confere com a nova senha.');
      return;
    }

    const ok = await changePassword(newPass);
    if (ok) {
      setPassSuccess(true);
      setTimeout(() => {
        setMustChange(false);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Subtle Gradient & Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl relative z-10">
        {/* Top Branding Logos */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {currentSettings?.clubLogoUrl && (
            <img
              src={currentSettings.clubLogoUrl}
              alt="Logo Clube"
              onError={(e) => {
                e.currentTarget.src = CLUB_LOGO_URL;
              }}
              className="w-16 h-16 object-contain rounded-lg bg-zinc-900/80 p-1 border border-zinc-700 shadow"
            />
          )}
          {currentSettings?.desbravadoresLogoUrl && (
            <img
              src={currentSettings.desbravadoresLogoUrl}
              alt="Logo Desbravadores"
              onError={(e) => {
                e.currentTarget.src = DESBRAVADORES_LOGO_URL;
              }}
              className="w-16 h-16 object-contain rounded-lg bg-zinc-900/80 p-1 border border-zinc-700 shadow"
            />
          )}
        </div>

        <div className="text-center mb-6">
          <div className="text-[10px] uppercase tracking-[0.25em] font-extrabold text-zinc-500 mb-1">
            SISTEMA DE GESTÃO
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-white leading-none">
            UNIVENDAS<span className="text-[#F97316]">.</span>
          </h1>
          <p className="text-xs text-[#F97316] font-extrabold uppercase tracking-[0.2em] mt-1.5">
            {currentSettings?.clubName || 'Clube de Desbravadores Pioneiros da Colina'}
          </p>
          <p className="text-xs text-zinc-400 mt-2 font-medium">
            Controle de Vendas de Uniformes, Estoque e Pedidos
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg flex items-center space-x-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Change Initial Password Step */}
        {mustChange ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-amber-300 text-xs space-y-1">
              <div className="font-bold flex items-center space-x-1 uppercase tracking-wider text-[11px]">
                <KeyRound className="w-4 h-4" />
                <span>Primeiro Acesso Detectado</span>
              </div>
              <p>
                Por segurança, altere a senha padrão mestre antes de prosseguir para o sistema.
              </p>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-extrabold text-zinc-400 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#080808] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-extrabold text-zinc-400 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-[#080808] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#F97316] text-black font-black uppercase tracking-[0.2em] py-3 rounded-lg hover:bg-orange-400 transition flex items-center justify-center space-x-2 text-xs shadow-lg"
            >
              {passSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>Senha Alterada! Entrando...</span>
                </>
              ) : (
                <>
                  <span>Salvar Nova Senha e Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Normal Login Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-extrabold text-zinc-400 mb-1">
                E-mail de Acesso
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: pioneirosdacolina@desbravadores.com"
                className="w-full bg-[#080808] border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-extrabold text-zinc-400 mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#080808] border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F97316] text-black font-black uppercase tracking-[0.2em] py-3 rounded-lg hover:bg-orange-400 transition flex items-center justify-center space-x-2 text-xs shadow-lg disabled:opacity-50"
            >
              <span>{loading ? 'Acessando...' : 'Acessar Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Credentials Help */}
            <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
              <p className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-zinc-500">
                Credenciais Mestre Padrão:
              </p>
              <p className="text-xs font-mono text-zinc-300 mt-1">
                pioneirosdacolina@desbravadores.com / pioneirosdacolina2026
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
