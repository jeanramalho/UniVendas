import React, { useState } from 'react';
import { Sale, Payment } from '../types';
import { ListOrdered, Search, Filter, Eye, DollarSign, FileSpreadsheet, X, Ban, Printer } from 'lucide-react';
import { exportSalesToExcel } from '../lib/excelExport';

interface SalesListViewProps {
  sales: Sale[];
  onCancelSale: (saleId: string, reason: string) => void;
  onAddPayment: (saleId: string, payment: Payment) => void;
  userName: string;
}

export const SalesListView: React.FC<SalesListViewProps> = ({
  sales,
  onCancelSale,
  onAddPayment,
  userName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const filtered = sales.filter((s) => {
    if (selectedStatus !== 'all' && s.overallStatus !== selectedStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        s.code.toLowerCase().includes(term) ||
        s.memberName.toLowerCase().includes(term) ||
        s.memberUnit.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleExport = () => {
    exportSalesToExcel(filtered, {
      title: 'Listagem de Vendas de Uniformes',
      userName,
      filtersApplied: `Status: ${selectedStatus}, Busca: ${searchTerm || 'Nenhuma'}`
    });
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalSale || !cancelReason) return;
    onCancelSale(cancelModalSale.id, cancelReason);
    setCancelModalSale(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ListOrdered className="w-5 h-5 text-[#F97316]" />
            <span>Histórico de Vendas</span>
          </h2>
          <p className="text-xs text-gray-400">
            Consultar vendas, pagamentos registrados e acompanhar atendimento de itens
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center space-x-1.5 bg-[#222222] hover:bg-[#333333] text-gray-200 text-xs px-3.5 py-2 rounded-lg border border-gray-700 transition"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exportar Vendas Excel</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-[#111111] border border-[#222222] p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por código da venda, membro ou unidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333333] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#F97316]"
          />
        </div>

        <div className="flex items-center space-x-2 bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#333333]">
          <Filter className="w-3.5 h-3.5 text-[#F97316]" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="aguardando_pagamento">Aguardando Pagamento</option>
            <option value="paga">Paga</option>
            <option value="aguardando_pedido">Aguardando Pedido Fornecedor</option>
            <option value="disponivel_entrega">Disponível para Entrega</option>
            <option value="entregue">Entregue</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-gray-300 font-semibold border-b border-[#2e2e2e]">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Data</th>
                <th className="p-3">Membro Comprador</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Valor Total</th>
                <th className="p-3">Pago</th>
                <th className="p-3">Status Pagamento</th>
                <th className="p-3">Situação Itens</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a] text-gray-300">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-white/5 transition">
                  <td className="p-3 font-mono font-bold text-[#F97316]">{s.code}</td>
                  <td className="p-3 text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 font-semibold text-white">{s.memberName}</td>
                  <td className="p-3 text-gray-400">{s.memberUnit}</td>
                  <td className="p-3 font-bold text-white">R$ {s.totalAmount.toFixed(2)}</td>
                  <td className="p-3 font-mono text-emerald-400 font-bold">
                    R$ {s.paidAmount.toFixed(2)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        s.paymentStatus === 'pago'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : s.paymentStatus === 'parcialmente_pago'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {s.paymentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] font-bold text-gray-300 bg-gray-800 px-2 py-0.5 rounded">
                      {s.overallStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => setViewingSale(s)}
                      className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded"
                      title="Ver Detalhes da Venda"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {s.overallStatus !== 'cancelada' && (
                      <button
                        onClick={() => setCancelModalSale(s)}
                        className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-red-400 rounded"
                        title="Cancelar Venda"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Viewing Sale Details */}
      {viewingSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-2xl w-full p-6 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingSale(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-4">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono">Detalhamento da Venda</span>
                <h3 className="text-xl font-bold text-[#F97316] font-mono">{viewingSale.code}</h3>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1 bg-gray-800 hover:bg-gray-700 text-xs text-white px-3 py-1.5 rounded-lg"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comprovante</span>
              </button>
            </div>

            {/* Member & Financial Summary */}
            <div className="grid grid-cols-2 gap-3 bg-[#111111] p-4 rounded-xl text-xs border border-[#222222]">
              <div>
                <span className="text-gray-500 block">Comprador:</span>
                <span className="font-bold text-white">{viewingSale.memberName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Unidade:</span>
                <span className="text-gray-300">{viewingSale.memberUnit}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Valor Total:</span>
                <span className="font-bold text-[#F97316]">R$ {viewingSale.totalAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Pago:</span>
                <span className="font-bold text-emerald-400">R$ {viewingSale.paidAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Items Included */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#F97316] uppercase tracking-wider">
                Itens Comprados ({viewingSale.items.length})
              </h4>
              <div className="space-y-1.5">
                {viewingSale.items.map((it) => (
                  <div
                    key={it.id}
                    className="bg-[#111111] p-3 rounded-lg border border-[#222222] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{it.productName}</div>
                      <div className="text-[11px] text-gray-400">
                        Tamanho: <span className="text-amber-300 font-bold">{it.size}</span> • Qtd: {it.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#F97316]">R$ {it.totalPrice.toFixed(2)}</div>
                      <span className="text-[9px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-mono uppercase">
                        {it.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment logs */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Histórico de Pagamentos
              </h4>
              {viewingSale.payments.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#111111] p-2.5 rounded-lg border border-[#222222] flex items-center justify-between text-xs text-gray-300"
                >
                  <div>
                    <span className="font-bold text-white">{p.method}</span>
                    <span className="text-[10px] text-gray-500 block">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString('pt-BR') : '-'} • Resp: {p.registeredBy}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">R$ {p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Sale */}
      {cancelModalSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleConfirmCancel}
            className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white border-b border-[#2e2e2e] pb-3">
              Cancelar Venda: {cancelModalSale.code}
            </h3>

            <p className="text-xs text-gray-300">
              O cancelamento irá liberar as reservas no estoque e registrar a ação na auditoria do sistema.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Justificativa do Cancelamento *
              </label>
              <textarea
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 h-20"
              />
            </div>

            <div className="pt-3 border-t border-[#2e2e2e] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCancelModalSale(null)}
                className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
