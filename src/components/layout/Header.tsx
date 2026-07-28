import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ShieldCheck, Database, Menu } from 'lucide-react';
import { AppSettings } from '../../types';
import { CLUB_LOGO_URL, DESBRAVADORES_LOGO_URL, INITIAL_SETTINGS } from '../../data/initialData';

interface HeaderProps {
  settings?: AppSettings;
  onOpenSettings?: () => void;
  activeTabTitle?: string;
  activeTab?: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  onOpenMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings = INITIAL_SETTINGS,
  onOpenSettings,
  activeTabTitle,
  onOpenMenu
}) => {
  const { user, logout } = useAuth();
  const currentSettings = settings || INITIAL_SETTINGS;

  return (
    <header className="bg-[#0a0a0a] text-white border-b border-zinc-800 px-4 py-3.5 sticky top-0 z-30 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left branding */}
        <div className="flex items-center space-x-3.5 min-w-0">
          <button
            type="button"
            onClick={onOpenMenu}
            className="md:hidden p-2 text-zinc-200 hover:bg-zinc-900 rounded border border-zinc-800"
            title="Abrir menu"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            {currentSettings?.clubLogoUrl ? (
              <img
                src={currentSettings.clubLogoUrl}
                alt="Clube Logo"
                onError={(e) => {
                  e.currentTarget.src = CLUB_LOGO_URL;
                }}
                className="w-9 h-9 object-contain rounded bg-zinc-900/80 p-0.5 border border-zinc-700"
              />
            ) : null}
            {currentSettings?.desbravadoresLogoUrl ? (
              <img
                src={currentSettings.desbravadoresLogoUrl}
                alt="Desbravadores Logo"
                onError={(e) => {
                  e.currentTarget.src = DESBRAVADORES_LOGO_URL;
                }}
                className="w-9 h-9 object-contain rounded bg-zinc-900/80 p-0.5 border border-zinc-700"
              />
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2.5">
              <h1 className="font-black text-base sm:text-lg tracking-tighter uppercase text-white leading-none">
                UNIVENDAS<span className="text-[#F97316]">.</span>
              </h1>
              <span className="hidden sm:inline bg-[#F97316] text-black font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-[0.15em] truncate max-w-40">
                {currentSettings?.clubName || 'Pioneiros da Colina'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium tracking-tight hidden sm:block mt-0.5">
              {activeTabTitle || 'Sistema de Vendas & Controle de Estoque'}
            </p>
          </div>
        </div>

        {/* Right User Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold px-3 py-1.5 rounded border border-zinc-700 transition tracking-wide"
            title="Configurações e Banco de Dados"
          >
            <Database className="w-3.5 h-3.5 text-[#F97316]" />
            <span className="hidden md:inline uppercase text-[10px] tracking-[0.15em]">Supabase</span>
          </button>

          {user && (
            <div className="flex items-center space-x-3 border-l border-zinc-800 pl-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-extrabold text-white flex items-center justify-end space-x-1 tracking-tight">
                  <span>{user.name}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
                </div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
                  PERFIL: {user.role === 'master' ? 'USUÁRIO MESTRE' : user.role.toUpperCase()}
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                title="Sair do Sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
