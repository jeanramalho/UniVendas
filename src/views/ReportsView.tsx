import React from 'react';
import { Member, Product, Sale, PurchaseBatch, AuditLog } from '../types';
import { FileSpreadsheet, Download, Layers, Users, ShoppingBag, DollarSign, ShieldCheck } from 'lucide-react';
import {
  exportMembersToExcel,
  exportSalesToExcel,
  exportBatchToExcel,
  exportAuditLogsToExcel
} from '../lib/excelExport';

interface ReportsViewProps {
  members: Member[];
  products: Product[];
  sales: Sale[];
  batches: PurchaseBatch[];
  logs: AuditLog[];
  userName: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  members,
  products,
  sales,
  batches,
  logs,
  userName
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Central de Relatórios e Exportação Excel</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Geração de relatórios com formatação visual profissional (.xlsx)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Report 1: Members */}
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-6 rounded-2xl space-y-4 hover:border-emerald-500/50 transition">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Relatório Geral de Membros</h3>
            <p className="text-xs text-gray-400 mt-1">
              Lista completa dos 471+ membros com unidades, responsáveis e tamanhos de referência.
            </p>
          </div>
          <button
            onClick={() => exportMembersToExcel(members, { title: 'Membros Pioneiros da Colina', userName })}
            className="w-full bg-[#222222] hover:bg-emerald-500 hover:text-black text-gray-200 border border-gray-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Planilha Excel</span>
          </button>
        </div>

        {/* Report 2: Sales & Financial */}
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-6 rounded-2xl space-y-4 hover:border-emerald-500/50 transition">
          <div className="p-3 bg-[#F97316]/10 text-[#F97316] rounded-xl w-fit">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Relatório de Vendas e Finanças</h3>
            <p className="text-xs text-gray-400 mt-1">
              Extrato detalhado de todas as vendas, descontos concedidos e pagamentos recebidos.
            </p>
          </div>
          <button
            onClick={() => exportSalesToExcel(sales, { title: 'Vendas de Uniformes', userName })}
            className="w-full bg-[#222222] hover:bg-emerald-500 hover:text-black text-gray-200 border border-gray-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Planilha Excel</span>
          </button>
        </div>

        {/* Report 3: Audit Logs */}
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-6 rounded-2xl space-y-4 hover:border-emerald-500/50 transition">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Trilha de Auditoria do Sistema</h3>
            <p className="text-xs text-gray-400 mt-1">
              Logs imutáveis de acessos, alterações de membros, vendas e importações.
            </p>
          </div>
          <button
            onClick={() => exportAuditLogsToExcel(logs, { title: 'Trilha de Auditoria', userName })}
            className="w-full bg-[#222222] hover:bg-emerald-500 hover:text-black text-gray-200 border border-gray-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Planilha Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
