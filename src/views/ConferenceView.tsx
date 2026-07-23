import React, { useState } from 'react';
import { PurchaseBatch, PurchaseBatchItem } from '../types';
import { CheckCircle2, ArrowLeft, AlertTriangle, Save, Truck } from 'lucide-react';
import { logAuditEvent } from '../lib/audit';

interface ConferenceViewProps {
  batch: PurchaseBatch;
  onBack: () => void;
  onSaveConference: (updatedBatch: PurchaseBatch) => void;
  userName: string;
}

export const ConferenceView: React.FC<ConferenceViewProps> = ({
  batch,
  onBack,
  onSaveConference,
  userName
}) => {
  const [conferenceItems, setConferenceItems] = useState<PurchaseBatchItem[]>(batch.items);
  const [notes, setNotes] = useState('');

  const handleQtyChange = (
    itemId: string,
    field: 'quantityReceived' | 'quantityMissing' | 'quantitySurplus' | 'quantityDamaged',
    value: number
  ) => {
    setConferenceItems(
      conferenceItems.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          // Auto calculate missing if received entered
          if (field === 'quantityReceived') {
            updated.quantityMissing = Math.max(0, item.quantityRequested - value);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleFinishConference = () => {
    const totalReq = conferenceItems.reduce((a, i) => a + i.quantityRequested, 0);
    const totalRec = conferenceItems.reduce((a, i) => a + i.quantityReceived, 0);

    const isPartial = totalRec < totalReq;
    const finalStatus = isPartial ? 'recebido_parcialmente' : 'conferido';

    const updatedBatch: PurchaseBatch = {
      ...batch,
      status: finalStatus,
      receivedAt: new Date().toISOString(),
      items: conferenceItems,
      notes: notes ? `${batch.notes || ''}\nConferência: ${notes}` : batch.notes,
      updatedAt: new Date().toISOString()
    };

    onSaveConference(updatedBatch);
    logAuditEvent(
      'usr-current',
      userName,
      'CONFERENCIA_RECEBIMENTO',
      'purchase_batches',
      `Conferência do Lote ${batch.code}: Solicitadas ${totalReq} pcs, Recebidas ${totalRec} pcs (${finalStatus})`
    );
    onBack();
  };

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
            <span className="text-[10px] text-gray-400 font-mono uppercase">Conferência de Mercadorias</span>
            <h2 className="text-xl font-bold text-white font-mono">Lote: {batch.code}</h2>
          </div>
        </div>

        <button
          onClick={handleFinishConference}
          className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-lg"
        >
          <Save className="w-4 h-4" />
          <span>Finalizar Conferência e Alocar Estoque</span>
        </button>
      </div>

      {/* Conference Table */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-gray-300 font-semibold border-b border-[#2e2e2e]">
              <tr>
                <th className="p-3">Membro Destino</th>
                <th className="p-3">Produto</th>
                <th className="p-3">Tamanho</th>
                <th className="p-3 text-center">Qtd Pedida</th>
                <th className="p-3 text-center">Qtd Recebida</th>
                <th className="p-3 text-center">Faltante</th>
                <th className="p-3 text-center">Excedente</th>
                <th className="p-3 text-center">Danificada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a] text-gray-300">
              {conferenceItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition">
                  <td className="p-3 font-semibold text-white">{item.memberName}</td>
                  <td className="p-3 text-gray-200 font-bold">{item.productName}</td>
                  <td className="p-3 font-bold text-amber-300">{item.size}</td>
                  <td className="p-3 text-center font-mono font-bold text-sm text-gray-300">
                    {item.quantityRequested}
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.quantityReceived}
                      onChange={(e) =>
                        handleQtyChange(item.id, 'quantityReceived', parseInt(e.target.value) || 0)
                      }
                      className="w-16 bg-[#111111] border border-[#333333] rounded text-center py-1 text-white font-bold text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-red-400">
                    {item.quantityMissing}
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.quantitySurplus}
                      onChange={(e) =>
                        handleQtyChange(item.id, 'quantitySurplus', parseInt(e.target.value) || 0)
                      }
                      className="w-16 bg-[#111111] border border-[#333333] rounded text-center py-1 text-white font-mono focus:outline-none"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.quantityDamaged}
                      onChange={(e) =>
                        handleQtyChange(item.id, 'quantityDamaged', parseInt(e.target.value) || 0)
                      }
                      className="w-16 bg-[#111111] border border-[#333333] rounded text-center py-1 text-white font-mono focus:outline-none"
                    />
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
