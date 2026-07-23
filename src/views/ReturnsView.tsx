import React, { useState } from 'react';
import { Sale, ReturnExchangeRecord } from '../types';
import { RefreshCw, Search, ArrowRight, CheckCircle2 } from 'lucide-react';
import { logAuditEvent } from '../lib/audit';

interface ReturnsViewProps {
  sales: Sale[];
  onProcessReturn: (record: ReturnExchangeRecord) => void;
  userName: string;
}

export const ReturnsView: React.FC<ReturnsViewProps> = ({ sales, onProcessReturn, userName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState<'novo' | 'usado' | 'danificado'>('novo');
  const [success, setSuccess] = useState(false);

  const filteredSales = sales.filter((s) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return s.code.toLowerCase().includes(t) || s.memberName.toLowerCase().includes(t);
  });

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !selectedItemId || !reason) return;

    const item = selectedSale.items.find((i) => i.id === selectedItemId);
    if (!item) return;

    const record: ReturnExchangeRecord = {
      id: `ret-${Date.now()}`,
      type: 'devolucao',
      saleId: selectedSale.id,
      saleCode: selectedSale.code,
      memberId: selectedSale.memberId,
      memberName: selectedSale.memberName,
      returnedItem: {
        productId: item.productId || '',
        productName: item.productName,
        size: item.size,
        quantity: 1,
        condition
      },
      reason,
      processedBy: userName,
      processedAt: new Date().toISOString()
    };

    onProcessReturn(record);
    logAuditEvent(
      'usr-current',
      userName,
      'PROCESSAR_DEVOLUCAO',
      'returns',
      `Devolução de ${item.productName} (${item.size}) da venda ${selectedSale.code}. Motivo: ${reason}`
    );

    setSuccess(true);
    setTimeout(() => {
      setSelectedSale(null);
      setReason('');
      setSuccess(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 text-[#F97316]" />
          <span>Trocas e Devoluções de Uniformes</span>
        </h2>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white">1. Localizar Venda do Membro</h3>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Digite o código da venda ou nome do membro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111111] border border-[#333333] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316]"
          />
        </div>

        {searchTerm && (
          <div className="bg-[#111111] border border-[#333333] rounded-xl divide-y divide-[#222222] max-h-48 overflow-y-auto text-xs">
            {filteredSales.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedSale(s);
                  setSelectedItemId(s.items[0]?.id || '');
                  setSearchTerm('');
                }}
                className="p-3 hover:bg-gray-800 cursor-pointer flex items-center justify-between text-gray-300"
              >
                <div>
                  <span className="font-bold text-white font-mono">{s.code}</span>
                  <span className="ml-2">{s.memberName}</span>
                </div>
                <span className="text-[#F97316] font-bold">R$ {s.totalAmount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {selectedSale && (
          <form onSubmit={handleConfirmReturn} className="space-y-4 pt-4 border-t border-[#2e2e2e]">
            <div className="bg-[#111111] p-3 rounded-lg border border-[#222222] text-xs">
              <span className="font-bold text-white block">
                Venda {selectedSale.code} — {selectedSale.memberName}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Selecione o Item para Devolução *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none"
              >
                {selectedSale.items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.productName} — Tam: {i.size} (R$ {i.unitPrice.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Condição do Item Devolvido
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="novo">Novo (Retorna ao Estoque)</option>
                <option value="usado">Usado</option>
                <option value="danificado">Danificado (Log de Avaria)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Motivo *</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Informe o motivo da troca ou devolução..."
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none h-20"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#F97316] text-black font-bold py-2.5 rounded-xl hover:bg-orange-400 transition text-xs flex items-center justify-center space-x-2"
            >
              {success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>Devolução Registrada!</span>
                </>
              ) : (
                <span>Confirmar Processamento de Devolução</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
