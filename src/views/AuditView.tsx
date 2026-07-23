import React, { useState } from 'react';
import { AuditLog } from '../types';
import { ShieldCheck, Search, Filter, FileSpreadsheet } from 'lucide-react';
import { exportAuditLogsToExcel } from '../lib/excelExport';

interface AuditViewProps {
  logs: AuditLog[];
  userName: string;
}

export const AuditView: React.FC<AuditViewProps> = ({ logs, userName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');

  const filtered = logs.filter((l) => {
    if (selectedAction !== 'all' && l.action !== selectedAction) return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      return (
        l.userName.toLowerCase().includes(t) ||
        l.action.toLowerCase().includes(t) ||
        l.details.toLowerCase().includes(t)
      );
    }
    return true;
  });

  const handleExport = () => {
    exportAuditLogsToExcel(filtered, {
      title: 'Relatório de Trilha de Auditoria do Sistema',
      userName
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>Trilha de Auditoria e Logs de Segurança</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Registro imutável de todas as ações administrativas, importações, vendas e movimentações
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center space-x-1.5 bg-[#222222] hover:bg-[#333333] text-gray-200 text-xs px-3.5 py-2 rounded-lg border border-gray-700 transition"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exportar Logs Excel</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 bg-[#111111] border border-[#222222] p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar logs por usuário, detalhes ou ação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333333] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-gray-300 font-semibold border-b border-[#2e2e2e]">
              <tr>
                <th className="p-3">Data e Hora</th>
                <th className="p-3">Operador / Usuário</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Módulo</th>
                <th className="p-3">Detalhamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a] text-gray-300 font-mono">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-white/5 transition">
                  <td className="p-3 text-gray-400 text-[11px]">
                    {new Date(l.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-white font-bold">{l.userName}</td>
                  <td className="p-3">
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                      {l.action}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 uppercase text-[10px]">{l.targetType}</td>
                  <td className="p-3 text-gray-300 text-xs font-sans max-w-md truncate">
                    {l.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
