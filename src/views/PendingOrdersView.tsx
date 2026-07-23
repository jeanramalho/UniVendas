import React, { useState } from 'react';
import { Sale, SaleItem } from '../types';
import { Clock, Filter, Package, CheckSquare, Square, ArrowRight, AlertTriangle } from 'lucide-react';

interface PendingOrdersViewProps {
  sales: Sale[];
  onCreateBatch: (selectedItems: { sale: Sale; item: SaleItem }[]) => void;
}

export const PendingOrdersView: React.FC<PendingOrdersViewProps> = ({ sales, onCreateBatch }) => {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [filterUnit, setFilterUnit] = useState('all');

  // Find all items eligible for supplier order
  const eligibleItems: { sale: Sale; item: SaleItem }[] = [];

  sales.forEach((s) => {
    if (s.overallStatus === 'cancelada') return;
    if (s.paymentStatus !== 'pago') return;

    s.items.forEach((item) => {
      if (item.status === 'pedido_a_fazer' && !item.batchId) {
        if (filterUnit === 'all' || s.memberUnit === filterUnit) {
          eligibleItems.push({ sale: s, item });
        }
      }
    });
  });

  const toggleSelectAll = () => {
    if (selectedItemIds.length === eligibleItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(eligibleItems.map((e) => e.item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter((i) => i !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  const handleCreateBatch = () => {
    const selected = eligibleItems.filter((e) => selectedItemIds.includes(e.item.id));
    if (selected.length === 0) return;
    onCreateBatch(selected);
  };

  const unitsList = Array.from(new Set(sales.map((s) => s.memberUnit))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-red-400" />
            <span>Itens Pendentes de Pedido ao Fornecedor</span>
          </h2>
          <p className="text-xs text-gray-400">
            Fila de peças pagas que não possuem estoque disponível e precisam ser pedidas ao fornecedor
          </p>
        </div>

        <button
          onClick={handleCreateBatch}
          disabled={selectedItemIds.length === 0}
          className="flex items-center space-x-2 bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-md disabled:opacity-40"
        >
          <Package className="w-4 h-4" />
          <span>Criar Lote com Selecionados ({selectedItemIds.length})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center space-x-3 bg-[#111111] border border-[#222222] p-3 rounded-xl">
        <Filter className="w-4 h-4 text-[#F97316]" />
        <span className="text-xs text-gray-400">Filtrar por Unidade:</span>
        <select
          value={filterUnit}
          onChange={(e) => setFilterUnit(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333333] rounded px-3 py-1 text-xs text-white focus:outline-none"
        >
          <option value="all">Todas as Unidades</option>
          {unitsList.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Table of pending items */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-gray-300 font-semibold border-b border-[#2e2e2e]">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                    {selectedItemIds.length === eligibleItems.length && eligibleItems.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#F97316]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Membro Solicitante</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Produto Requerido</th>
                <th className="p-3">Tamanho</th>
                <th className="p-3 text-center">Quantidade</th>
                <th className="p-3">Cód. Venda</th>
                <th className="p-3">Status Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a] text-gray-300">
              {eligibleItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-500">
                    Nenhum item pendente de pedido ao fornecedor no momento.
                  </td>
                </tr>
              ) : (
                eligibleItems.map(({ sale, item }) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelectItem(item.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-[#F97316]/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="p-3 text-center">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#F97316]" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-600" />
                        )}
                      </td>
                      <td className="p-3 font-semibold text-white">{sale.memberName}</td>
                      <td className="p-3 text-gray-400">{sale.memberUnit}</td>
                      <td className="p-3 font-bold text-white">{item.productName}</td>
                      <td className="p-3 font-bold text-amber-300">{item.size}</td>
                      <td className="p-3 text-center font-mono font-bold">{item.quantity}x</td>
                      <td className="p-3 font-mono text-[#F97316] font-bold">{sale.code}</td>
                      <td className="p-3">
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                          {sale.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
