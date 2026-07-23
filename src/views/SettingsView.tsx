import React, { useState } from 'react';
import { Settings, Database, Download, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { MIGRATION_SQL } from '../data/supabaseMigration';

interface SettingsViewProps {
  onClearAllData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClearAllData }) => {
  const [copiedSql, setCopiedSql] = useState(false);

  const handleDownloadSql = () => {
    const element = document.createElement('a');
    const file = new Blob([MIGRATION_SQL], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'univendas_supabase_schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Settings className="w-5 h-5 text-[#F97316]" />
            <span>Configurações do Sistema e Banco de Dados Supabase</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Status da conexão Supabase, exportação da SQL de Migração e identidades do clube
          </p>
        </div>
      </div>

      {/* Supabase Status Box */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-6 rounded-2xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Database className="w-5 h-5 text-emerald-400" />
          <span>Status do Banco de Dados Supabase (Project dtszbdcljnfxffualwah)</span>
        </h3>

        <div className="bg-[#111111] p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Conexão Supabase Configurada</span>
            </span>
            <p className="text-xs text-gray-400 font-mono">
              URL: https://dtszbdcljnfxffualwah.supabase.co
            </p>
          </div>
          <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold">
            Modo Local & Cloud Persistente
          </span>
        </div>
      </div>

      {/* SQL Migration Downloader */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Exportação do Script SQL de Migração</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Contém a DDL completa das tabelas (members, sales, products, batches, audit_logs) e políticas RLS.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopySql}
              className="bg-[#222222] hover:bg-[#333333] text-gray-300 text-xs px-3.5 py-2 rounded-lg border border-gray-700 transition"
            >
              {copiedSql ? 'Copiado!' : 'Copiar SQL'}
            </button>
            <button
              onClick={handleDownloadSql}
              className="flex items-center space-x-1.5 bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs px-4 py-2 rounded-lg transition shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo .SQL</span>
            </button>
          </div>
        </div>

        <div className="bg-[#111111] p-4 rounded-xl border border-[#222222] font-mono text-[11px] text-gray-400 max-h-48 overflow-y-auto">
          <pre>{MIGRATION_SQL}</pre>
        </div>
      </div>

      {/* Data Management & Reset */}
      {onClearAllData && (
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-rose-500" />
                <span>Limpar e Zerar Base de Dados</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Remova todos os registros de teste e deixe o sistema limpo para iniciar a importação da sua planilha real de membros.
              </p>
            </div>
            <button
              onClick={onClearAllData}
              className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-bold text-xs px-4 py-2.5 rounded-lg border border-rose-500/40 transition flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Zerar Todos os Dados</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
