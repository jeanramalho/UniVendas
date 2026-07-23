import React from 'react';
import { Sale, PurchaseBatch } from '../types';
import { TrendingUp, DollarSign, CheckCircle2, Clock, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { exportSalesToExcel } from '../lib/excelExport';

interface FinancialViewProps {
  sales: Sale[];
  batches: PurchaseBatch[];
  userName: string;
}

export const FinancialView: React.FC<FinancialViewProps> = ({ sales, batches, userName }) => {
  const grossRevenue = sales.reduce((a, s) => a + s.subtotal, 0);
  const totalDiscounts = sales.reduce((a, s) => a + s.discount, 0);
  const netRevenue = sales.reduce((a, s) => a + s.totalAmount, 0);
  const totalReceived = sales.reduce((a, s) => a + s.paidAmount, 0);
  const totalReceivables = sales.reduce((a, s) => a + s.pendingAmount, 0);

  const totalSupplierPayables = batches.reduce((a, b) => a + b.estimatedCost, 0);
  const estimatedProfit = netRevenue - totalSupplierPayables;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>Fechamento Financeiro do Clube</span>
          </h2>
          <p className="text-xs text-gray-400">
            Faturamento bruto, descontos concedidos, recebimentos e contas a pagar com fornecedores
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
          <span className="text-xs text-gray-400">Faturamento Bruto</span>
          <div className="text-xl font-black text-white">
            R$ {grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
          <span className="text-xs text-gray-400">Descontos Concedidos</span>
          <div className="text-xl font-black text-amber-400">
            R$ {totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
          <span className="text-xs text-gray-400">Faturamento Líquido</span>
          <div className="text-xl font-black text-[#F97316]">
            R$ {netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
          <span className="text-xs text-gray-400">Total Efetivamente Recebido</span>
          <div className="text-xl font-black text-emerald-400">
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Contas a Receber dos Membros</span>
          </h3>
          <div className="text-3xl font-black text-amber-400 font-mono">
            R$ {totalReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-400">
            Valores de vendas parciais ou pendentes aguardando pagamento para liberação.
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-5 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-400" />
            <span>Custo Estimado dos Pedidos ao Fornecedor</span>
          </h3>
          <div className="text-3xl font-black text-blue-400 font-mono">
            R$ {totalSupplierPayables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-400">
            Soma dos custos de produção e aquisição dos lotes junto aos fornecedores.
          </p>
        </div>
      </div>
    </div>
  );
};
