import React, { useState } from 'react';
import { Sale, SaleItem, DeliveryRecord } from '../types';
import { Truck, CheckCircle2, Search, UserCheck, PackageCheck, Printer } from 'lucide-react';
import { logAuditEvent } from '../lib/audit';

interface DeliveriesViewProps {
  sales: Sale[];
  onConfirmDelivery: (record: DeliveryRecord) => void;
  userName: string;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({
  sales,
  onConfirmDelivery,
  userName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deliveredTo, setDeliveredTo] = useState('');

  // Sales eligible for delivery (paid sales with un-delivered items)
  const readySales = sales.filter(
    (s) => s.overallStatus !== 'cancelada' && s.paidAmount > 0 && s.items.some((i) => i.status !== 'entregue')
  );

  const filtered = readySales.filter((s) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      s.memberName.toLowerCase().includes(t) ||
      s.code.toLowerCase().includes(t) ||
      s.memberUnit.toLowerCase().includes(t)
    );
  });

  const handleSelectSale = (s: Sale) => {
    setSelectedSale(s);
    setDeliveredTo(s.memberName);
    const readyItemIds = s.items
      .filter((i) => i.status === 'reservado' || i.status === 'disponivel_entrega')
      .map((i) => i.id);
    setSelectedItems(readyItemIds);
  };

  const handleSaveDelivery = () => {
    if (!selectedSale || selectedItems.length === 0 || !deliveredTo) return;

    const itemsToDeliver = selectedSale.items.filter((i) => selectedItems.includes(i.id));

    const record: DeliveryRecord = {
      id: `del-${Date.now()}`,
      saleId: selectedSale.id,
      saleCode: selectedSale.code,
      memberId: selectedSale.memberId,
      memberName: selectedSale.memberName,
      memberUnit: selectedSale.memberUnit,
      deliveredTo,
      deliveredBy: userName,
      deliveredAt: new Date().toISOString(),
      items: itemsToDeliver.map((i) => ({
        saleItemId: i.id,
        productName: i.productName,
        size: i.size,
        quantity: i.quantity
      }))
    };

    onConfirmDelivery(record);
    logAuditEvent(
      'usr-current',
      userName,
      'REGISTRAR_ENTREGA',
      'deliveries',
      `Entrega de ${itemsToDeliver.length} itens da venda ${selectedSale.code} para ${deliveredTo}`
    );

    setSelectedSale(null);
    setSelectedItems([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <span>Fila de Entregas aos Membros</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Produtos reservados ou recebidos prontos para retirada pelos membros do clube
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Ready Sales List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar membro ou venda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111111] border border-[#333333] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 bg-[#1a1a1a] rounded-xl text-center text-xs text-gray-500">
                Nenhum membro aguardando entrega no momento.
              </div>
            ) : (
              filtered.map((s) => {
                const readyCount = s.items.filter(
                  (i) => (i.status === 'reservado' || i.status === 'disponivel_entrega') && i.status !== 'entregue'
                ).length;
                const pendingCount = s.items.filter((i) => i.status === 'pedido_a_fazer').length;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSale(s)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      selectedSale?.id === s.id
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-[#1a1a1a] border-[#2e2e2e] text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{s.memberName}</span>
                      <span className="font-mono text-xs text-[#F97316] font-bold">{s.code}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                      <span>{s.memberUnit}</span>
                      <span className="space-x-1">
                        {readyCount > 0 && (
                          <span className="text-emerald-400 font-bold">{readyCount} pronto(s)</span>
                        )}
                        {pendingCount > 0 && (
                          <span className="text-amber-400 text-[10px]">({pendingCount} a pedir)</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Delivery Form */}
        <div className="md:col-span-2">
          {!selectedSale ? (
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-12 text-center text-xs text-gray-500 space-y-2">
              <PackageCheck className="w-10 h-10 text-gray-600 mx-auto" />
              <p>Selecione um membro na lista ao lado para registrar a entrega dos uniformes.</p>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedSale.memberName}</h3>
                  <p className="text-xs text-gray-400">
                    Unidade: {selectedSale.memberUnit} • Venda: {selectedSale.code}
                  </p>
                </div>
              </div>

              {/* Items Selection */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300 block">
                  Selecione as Peças que Serão Entregues Agora:
                </span>
                <div className="space-y-2">
                  {selectedSale.items
                    .filter((i) => i.status !== 'entregue')
                    .map((item) => {
                      const isChecked = selectedItems.includes(item.id);
                      const isReady = item.status === 'reservado' || item.status === 'disponivel_entrega';

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedItems(selectedItems.filter((id) => id !== item.id));
                            } else {
                              setSelectedItems([...selectedItems, item.id]);
                            }
                          }}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500 text-white'
                              : 'bg-[#111111] border-[#222222] text-gray-400'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white">{item.productName}</span>
                              {!isReady && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase">
                                  Entrega Prioritária
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-amber-300 block">
                              Tamanho: {item.size} • Quantidade: {item.quantity}x
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-gray-700 text-emerald-500 focus:ring-0"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Recipient Name Field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300">
                  Nome de Quem Retirou a Mercadoria *
                </label>
                <input
                  type="text"
                  required
                  value={deliveredTo}
                  onChange={(e) => setDeliveredTo(e.target.value)}
                  placeholder="ex: Nome do Desbravador ou Responsável"
                  className="w-full bg-[#111111] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Delivery */}
              <button
                onClick={handleSaveDelivery}
                disabled={selectedItems.length === 0 || !deliveredTo}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition shadow-lg text-xs disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span>Confirmar Saída Definitiva e Registrar Entrega</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
