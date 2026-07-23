import React, { useState } from 'react';
import { PurchaseBatch } from '../types';
import { Package, FileSpreadsheet, ArrowLeft, Send, Users, Layers, CheckCircle2 } from 'lucide-react';
import { exportBatchToExcel } from '../lib/excelExport';

interface BatchDetailViewProps {
  batch: PurchaseBatch;
  onBack: () => void;
  onOpenConference: (batch: PurchaseBatch) => void;
  userName: string;
}

export const BatchDetailView: React.FC<BatchDetailViewProps> = ({
  batch,
  onBack,
  onOpenConference,
  userName
}) => {
  const [viewMode, setViewMode] = useState<'product' | 'member'>('product');

  const handleExport = () => {
    exportBatchToExcel(batch, {
      title: `Lote ${batch.code} - Detalhamento`,
      userName
    });
  };

  // Group by Product and Size
  const productGroupMap = new Map<string, { name: string; size: string; qty: number; unitCost: number }>();
  batch.items.forEach((item) => {
    const key = `${item.productId}_${item.size}`;
    const existing = productGroupMap.get(key) || {
      name: item.productName,
      size: item.size,
      qty: 0,
      unitCost: item.unitCost
    };
    existing.qty += item.quantityRequested;
    productGroupMap.set(key, existing);
  });
  const groupedProducts = Array.from(productGroupMap.values());

  // Group by Member
  const memberGroupMap = new Map<
    string,
    { memberName: string; unit: string; items: { productName: string; size: string; qty: number; saleCode: string }[] }
  >();
  batch.items.forEach((item) => {
    const existing = memberGroupMap.get(item.memberId) || {
      memberName: item.memberName,
      unit: item.memberUnit,
      items: []
    };
    existing.items.push({
      productName: item.productName,
      size: item.size,
      qty: item.quantityRequested,
      saleCode: item.saleCode
    });
    memberGroupMap.set(item.memberId, existing);
  });
  const groupedMembers = Array.from(memberGroupMap.values());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-[#111111] hover:bg-gray-800 text-gray-300 rounded-lg border border-[#333333]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] text-gray-400 font-mono uppercase">Detalhamento do Lote</span>
            <h2 className="text-xl font-bold text-white font-mono">{batch.code}</h2>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 bg-[#222222] hover:bg-[#333333] text-gray-200 text-xs px-3.5 py-2 rounded-lg border border-gray-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Excel 4 Abas</span>
          </button>

          <button
            onClick={() => onOpenConference(batch)}
            className="flex items-center space-x-1.5 bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Realizar Conferência</span>
          </button>
        </div>
      </div>

      {/* Batch Summary Box */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#111111] border border-[#222222] p-4 rounded-xl text-xs">
        <div>
          <span className="text-gray-500 block">Fornecedor:</span>
          <span className="font-bold text-white text-sm">{batch.supplierName}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Total de Peças:</span>
          <span className="font-bold text-white text-sm">{batch.totalItems} pcs</span>
        </div>
        <div>
          <span className="text-gray-500 block">Custo Estimado:</span>
          <span className="font-bold text-[#F97316] text-sm">
            R$ {batch.estimatedCost.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">Status Atual:</span>
          <span className="font-bold text-blue-400 uppercase">{batch.status.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Mode View Switcher Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#2e2e2e] pb-2">
        <button
          onClick={() => setViewMode('product')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            viewMode === 'product'
              ? 'bg-[#F97316] text-black shadow-md'
              : 'bg-[#1a1a1a] text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Agrupado por Produto & Tamanho</span>
        </button>

        <button
          onClick={() => setViewMode('member')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            viewMode === 'member'
              ? 'bg-[#F97316] text-black shadow-md'
              : 'bg-[#1a1a1a] text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Agrupado por Membro Destino</span>
        </button>
      </div>

      {/* View Mode 1: Grouped by Product & Size */}
      {viewMode === 'product' && (
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-gray-300 font-semibold border-b border-[#2e2e2e]">
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3">Tamanho</th>
                <th className="p-3 text-center">Quantidade Total Pedida</th>
                <th className="p-3 text-right">Custo Unitário</th>
                <th className="p-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a] text-gray-300">
              {groupedProducts.map((g, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition">
                  <td className="p-3 font-bold text-white">{g.name}</td>
                  <td className="p-3 font-bold text-amber-300">{g.size}</td>
                  <td className="p-3 text-center font-mono font-bold text-sm">{g.qty} pcs</td>
                  <td className="p-3 text-right font-mono">R$ {g.unitCost.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-bold text-[#F97316]">
                    R$ {(g.qty * g.unitCost).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Mode 2: Grouped by Member */}
      {viewMode === 'member' && (
        <div className="space-y-4">
          {groupedMembers.map((m, idx) => (
            <div key={idx} className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-2">
                <span className="font-bold text-white text-sm">{m.memberName}</span>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">{m.unit}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {m.items.map((it, iIdx) => (
                  <div
                    key={iIdx}
                    className="bg-[#111111] p-2.5 rounded-lg border border-[#222222] flex items-center justify-between text-gray-300"
                  >
                    <div>
                      <span className="font-semibold text-white block">{it.productName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Venda: {it.saleCode} • Tam: <span className="text-amber-300 font-bold">{it.size}</span>
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">{it.qty}x</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
