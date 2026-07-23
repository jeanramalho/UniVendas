import React, { useState } from 'react';
import { Product } from '../types';
import { Layers, AlertTriangle, Search, CheckCircle2, RefreshCw } from 'lucide-react';

interface StockViewProps {
  products: Product[];
}

export const StockView: React.FC<StockViewProps> = ({ products }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Flatten products and variants into a stock table list
  const stockRows = products.flatMap((p) =>
    p.variants.map((v) => {
      const available = Math.max(0, v.physicalStock - v.reservedStock);
      const isLow = available <= p.minStock;

      return {
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        categoryName: p.categoryName || 'Geral',
        variantId: v.id,
        size: v.size,
        physicalStock: v.physicalStock,
        reservedStock: v.reservedStock,
        availableStock: available,
        minStock: p.minStock,
        isLow
      };
    })
  );

  const filtered = stockRows.filter((r) => {
    if (onlyLowStock && !r.isLow) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.productName.toLowerCase().includes(term) ||
        r.productCode.toLowerCase().includes(term) ||
        r.size.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalPhysicalAll = stockRows.reduce((a, r) => a + r.physicalStock, 0);
  const totalReservedAll = stockRows.reduce((a, r) => a + r.reservedStock, 0);
  const totalAvailableAll = stockRows.reduce((a, r) => a + r.availableStock, 0);
  const lowStockCount = stockRows.filter((r) => r.isLow).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#F97316]" />
            <span>Controle de Estoque Físico e Reservas</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Visualização de estoque disponível <span className="font-mono text-[#F97316]">(Físico - Reservado)</span>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
          <span className="text-xs text-gray-400">Estoque Físico Total</span>
          <div className="text-2xl font-black text-white">{totalPhysicalAll} pcs</div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
          <span className="text-xs text-gray-400">Estoque Reservado</span>
          <div className="text-2xl font-black text-amber-400">{totalReservedAll} pcs</div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
          <span className="text-xs text-gray-400">Estoque Disponível</span>
          <div className="text-2xl font-black text-emerald-400">{totalAvailableAll} pcs</div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
          <span className="text-xs text-gray-400">Itens c/ Estoque Baixo</span>
          <div className="text-2xl font-black text-red-400">{lowStockCount} itens</div>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex flex-col md:flex-row gap-3 bg-[#111111] border border-[#222222] p-3 rounded-xl items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por produto, código ou tamanho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333333] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#F97316]"
          />
        </div>

        <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#333333] whitespace-nowrap">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="rounded border-gray-700 text-[#F97316] focus:ring-0"
          />
          <span>Mostrar apenas estoque abaixo do mínimo</span>
        </label>
      </div>

      {/* Stock Table */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-gray-300 font-semibold border-b border-[#2e2e2e]">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Produto</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Tamanho</th>
                <th className="p-3 text-center">Físico</th>
                <th className="p-3 text-center">Reservado</th>
                <th className="p-3 text-center">Disponível</th>
                <th className="p-3 text-center">Mínimo</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a] text-gray-300">
              {filtered.map((r, idx) => (
                <tr key={`${r.productId}_${r.variantId}_${idx}`} className="hover:bg-white/5 transition">
                  <td className="p-3 font-mono font-bold text-[#F97316]">{r.productCode}</td>
                  <td className="p-3 font-semibold text-white">{r.productName}</td>
                  <td className="p-3 text-gray-400">{r.categoryName}</td>
                  <td className="p-3">
                    <span className="font-bold text-amber-300 bg-gray-800 px-2 py-0.5 rounded border border-amber-500/20">
                      {r.size}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono font-bold">{r.physicalStock}</td>
                  <td className="p-3 text-center font-mono text-amber-400 font-bold">{r.reservedStock}</td>
                  <td className="p-3 text-center font-mono text-emerald-400 font-black text-sm">
                    {r.availableStock}
                  </td>
                  <td className="p-3 text-center font-mono text-gray-500">{r.minStock}</td>
                  <td className="p-3 text-right">
                    {r.isLow ? (
                      <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        Reposição
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        Normal
                      </span>
                    )}
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
