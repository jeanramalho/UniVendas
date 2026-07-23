import React, { useState } from 'react';
import { PurchaseBatch } from '../types';
import { Package, Eye, FileSpreadsheet, Send, CheckCircle2, Truck, Clock } from 'lucide-react';
import { exportBatchToExcel } from '../lib/excelExport';

interface PurchaseBatchesViewProps {
  batches: PurchaseBatch[];
  onSelectBatch: (batch: PurchaseBatch) => void;
  userName: string;
}

export const PurchaseBatchesView: React.FC<PurchaseBatchesViewProps> = ({
  batches,
  onSelectBatch,
  userName
}) => {
  const handleExportBatch = (batch: PurchaseBatch) => {
    exportBatchToExcel(batch, {
      title: `Lote de Pedido ${batch.code}`,
      userName
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span>Lotes de Pedidos ao Fornecedor</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Acompanhamento de pedidos agrupados por lote, envio ao fornecedor e conferências
          </p>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-gray-300 font-semibold border-b border-[#2e2e2e]">
              <tr>
                <th className="p-3">Código do Lote</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3">Itens Inclusos</th>
                <th className="p-3">Custo Estimado</th>
                <th className="p-3">Data Envio</th>
                <th className="p-3">Previsão Entrega</th>
                <th className="p-3">Status do Lote</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a] text-gray-300">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-500">
                    Nenhum lote de pedido ao fornecedor registrado até o momento.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-mono font-bold text-blue-400">{b.code}</td>
                    <td className="p-3 font-semibold text-white">{b.supplierName}</td>
                    <td className="p-3 font-mono font-bold">{b.totalItems} pcs</td>
                    <td className="p-3 font-mono text-[#F97316] font-bold">
                      R$ {b.estimatedCost.toFixed(2)}
                    </td>
                    <td className="p-3 text-gray-400">
                      {b.sentAt ? new Date(b.sentAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-3 text-gray-400">{b.expectedDeliveryDate || '-'}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 uppercase">
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => onSelectBatch(b)}
                        className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded"
                        title="Ver / Conferir Lote"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleExportBatch(b)}
                        className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-emerald-400 rounded"
                        title="Exportar Lote Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
