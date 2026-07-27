import React, { useState } from 'react';
import { Payment, PaymentMethod, Product, Sale, SaleItem, SaleItemStatus } from '../types';
import {
  Ban,
  DollarSign,
  Edit3,
  Eye,
  FileSpreadsheet,
  Filter,
  ListOrdered,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { exportSalesToExcel } from '../lib/excelExport';
import { currencyInputValue, formatCurrency, normalizeCurrencyInput, parseCurrencyInput } from '../lib/currency';

interface SalesListViewProps {
  sales: Sale[];
  products: Product[];
  onCancelSale: (saleId: string, reason: string) => void;
  onAddPayment: (saleId: string, payment: Payment) => void;
  onUpdateSale: (sale: Sale) => void;
  userName: string;
}

const createId = () => crypto.randomUUID();

const saleCanBeEdited = (sale: Sale) =>
  sale.overallStatus !== 'cancelada' &&
  sale.overallStatus !== 'entregue' &&
  !sale.items.some((item) => item.status === 'entregue' || Boolean(item.deliveryId));

const keepBatchStatus = (status: SaleItemStatus) =>
  [
    'incluido_em_lote',
    'pedido_fechado',
    'pedido_enviado',
    'aguardando_fornecedor',
    'recebido_parcialmente',
    'recebido',
    'em_conferencia',
    'conferido_com_divergencia',
    'disponivel_entrega'
  ].includes(status);

export const SalesListView: React.FC<SalesListViewProps> = ({
  sales,
  products,
  onCancelSale,
  onAddPayment,
  onUpdateSale,
  userName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [paymentModalSale, setPaymentModalSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardholderIsMember, setCardholderIsMember] = useState(true);

  const activeProducts = products.filter((product) => product.active !== false && product.variants.length > 0);

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

  const getReservedQuantityInOriginalSale = (variantId?: string) => {
    if (!editingSale || !variantId || editingSale.paymentStatus !== 'pago') return 0;
    return editingSale.items
      .filter((item) => item.variantId === variantId && item.status === 'reservado')
      .reduce((total, item) => total + item.quantity, 0);
  };

  const getAvailabilityStatus = (
    product: Product,
    variantId: string,
    quantity: number,
    currentStatus?: SaleItemStatus
  ): SaleItemStatus => {
    if (currentStatus && keepBatchStatus(currentStatus)) return currentStatus;

    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return 'pedido_a_fazer';

    const availableStock =
      Math.max(0, variant.physicalStock - variant.reservedStock) + getReservedQuantityInOriginalSale(variant.id);

    if (!product.allowSaleWithoutStock && availableStock < quantity) return 'pedido_a_fazer';
    return availableStock >= quantity ? 'reservado' : 'pedido_a_fazer';
  };

  const buildSaleItem = (
    product: Product,
    variantId: string,
    quantity: number,
    existing?: SaleItem
  ): SaleItem => {
    const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];
    const safeQuantity = Math.max(1, quantity || 1);
    const status = getAvailabilityStatus(product, variant.id, safeQuantity, existing?.status);

    return {
      id: existing?.id || createId(),
      saleId: editingSale?.id || existing?.saleId || '',
      isKit: false,
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      size: variant.size,
      quantity: safeQuantity,
      unitPrice: variant.price,
      totalPrice: variant.price * safeQuantity,
      status,
      batchId: existing?.batchId,
      batchCode: existing?.batchCode,
      deliveryId: existing?.deliveryId
    };
  };

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    // Build editItems using the stored productId/size to find the correct product/variant in the catalog
    setEditItems(sale.items.map((item) => {
      const existingProduct = activeProducts.find((p) => p.id === item.productId);
      if (!existingProduct) return { ...item, components: item.components ? [...item.components] : undefined };
      // Find variant by ID first, then by size as fallback
      const existingVariant =
        existingProduct.variants.find((v) => v.id === item.variantId) ||
        existingProduct.variants.find((v) => v.size === item.size) ||
        existingProduct.variants[0];
      const resolvedVariantId = existingVariant?.id || item.variantId || '';
      return {
        ...item,
        productId: existingProduct.id,
        variantId: resolvedVariantId,
        size: existingVariant?.size || item.size,
        components: item.components ? [...item.components] : undefined
      };
    }));
  };

  const updateEditItem = (itemId: string, productId: string, variantId: string, quantity: number) => {
    const product = activeProducts.find((p) => p.id === productId);
    if (!product) return;

    setEditItems((prev) =>
      prev.map((item) => (item.id === itemId ? buildSaleItem(product, variantId, quantity, item) : item))
    );
  };

  const addEditItem = () => {
    const product = activeProducts[0];
    const variant = product?.variants[0];
    if (!product || !variant) return;
    setEditItems((prev) => [...prev, buildSaleItem(product, variant.id, 1)]);
  };

  const handleConfirmEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || editItems.length === 0 || !saleCanBeEdited(editingSale)) return;

    const subtotal = editItems.reduce((total, item) => total + item.totalPrice, 0);
    const totalAmount = Math.max(0, subtotal - editingSale.discount + editingSale.addition);
    const paidAmount = Math.min(editingSale.paidAmount, totalAmount);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);
    const paymentStatus = pendingAmount <= 0 && totalAmount > 0 ? 'pago' : paidAmount > 0 ? 'parcialmente_pago' : 'a_pagar';
    const hasMissingStock = editItems.some((item) => item.status === 'pedido_a_fazer');
    const hasReadyItems = editItems.some((item) => item.status === 'reservado' || item.status === 'disponivel_entrega');
    const overallStatus =
      paymentStatus !== 'pago'
        ? 'aguardando_pagamento'
        : hasMissingStock
        ? 'aguardando_pedido'
        : hasReadyItems
        ? 'parcialmente_disponivel'
        : editingSale.overallStatus;

    onUpdateSale({
      ...editingSale,
      items: editItems.map((item) => ({ ...item, saleId: editingSale.id })),
      subtotal,
      totalAmount,
      paidAmount,
      pendingAmount,
      paymentStatus,
      overallStatus,
      updatedAt: new Date().toISOString()
    });

    setEditingSale(null);
    setEditItems([]);
  };

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

  const openPaymentModal = (sale: Sale) => {
    setPaymentModalSale(sale);
    setPaymentMethod('PIX');
    setPaymentAmount(currencyInputValue(sale.pendingAmount || sale.totalAmount - sale.paidAmount));
    setCardholderName('');
    setCardholderIsMember(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalSale) return;

    const amount = Math.min(
      parseCurrencyInput(paymentAmount),
      paymentModalSale.pendingAmount || paymentModalSale.totalAmount - paymentModalSale.paidAmount
    );
    if (amount <= 0) return;

    onAddPayment(paymentModalSale.id, {
      id: createId(),
      saleId: paymentModalSale.id,
      amount,
      method: paymentMethod,
      status: 'pago',
      paidAt: new Date().toISOString(),
      registeredBy: userName,
      createdAt: new Date().toISOString(),
      ...(paymentMethod === 'Cartão de crédito' ? {
        cardholderName: cardholderIsMember ? paymentModalSale.memberName : cardholderName,
        cardholderIsMember
      } : {})
    });

    setPaymentModalSale(null);
    setPaymentAmount('');
    setCardholderName('');
    setCardholderIsMember(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ListOrdered className="w-5 h-5 text-[#F97316]" />
            <span>Histórico de Vendas</span>
          </h2>
          <p className="text-xs text-gray-400">
            Consultar vendas, editar pedidos em aberto e acompanhar atendimento de itens
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
                  <td className="p-3 text-gray-400">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3 font-semibold text-white">{s.memberName}</td>
                  <td className="p-3 text-gray-400">{s.memberUnit}</td>
                  <td className="p-3 font-bold text-white">R$ {formatCurrency(s.totalAmount)}</td>
                  <td className="p-3 font-mono text-emerald-400 font-bold">R$ {formatCurrency(s.paidAmount)}</td>
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
                    {saleCanBeEdited(s) && (
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-[#F97316] rounded"
                        title="Editar venda antes da entrega"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {s.overallStatus !== 'cancelada' && s.paymentStatus !== 'pago' && (
                      <button
                        onClick={() => openPaymentModal(s)}
                        className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-emerald-400 rounded"
                        title="Marcar venda como paga"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>
                    )}
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

      {viewingSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-2xl w-full p-6 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setViewingSale(null)} className="absolute right-4 top-4 text-gray-400 hover:text-white">
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
                <span className="font-bold text-[#F97316]">R$ {formatCurrency(viewingSale.totalAmount)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Pago:</span>
                <span className="font-bold text-emerald-400">R$ {formatCurrency(viewingSale.paidAmount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#F97316] uppercase tracking-wider">
                Itens Comprados ({viewingSale.items.length})
              </h4>
              <div className="space-y-1.5">
                {viewingSale.items.map((it) => (
                  <div key={it.id} className="bg-[#111111] p-3 rounded-lg border border-[#222222] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{it.productName}</div>
                      <div className="text-[11px] text-gray-400">
                        Tamanho: <span className="text-amber-300 font-bold">{it.size}</span> • Qtd: {it.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#F97316]">R$ {formatCurrency(it.totalPrice)}</div>
                      <span className="text-[9px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-mono uppercase">
                        {it.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Histórico de Pagamentos</h4>
              {viewingSale.payments.map((p) => (
                <div key={p.id} className="bg-[#111111] p-2.5 rounded-lg border border-[#222222] flex items-center justify-between text-xs text-gray-300">
                  <div>
                    <span className="font-bold text-white">{p.method}</span>
                    <span className="text-[10px] text-gray-500 block">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString('pt-BR') : '-'} • Resp: {p.registeredBy}
                    </span>
                    {p.cardholderName && (
                      <span className="text-[10px] text-amber-300 block mt-0.5">
                        Titular: {p.cardholderName}{p.cardholderIsMember === false ? ' (não membro)' : ''}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-emerald-400">R$ {formatCurrency(p.amount)}</span>
                </div>
              ))}
              {viewingSale.payments.length === 0 && (
                <div className="bg-[#111111] p-3 rounded-lg border border-[#222222] text-xs text-gray-500">
                  Nenhum pagamento registrado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleConfirmEdit}
            className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#2e2e2e] pb-3">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono">Editar venda antes da entrega</span>
                <h3 className="text-lg font-bold text-[#F97316] font-mono">{editingSale.code}</h3>
                <p className="text-xs text-gray-400">
                  {editingSale.memberName} • {editingSale.memberUnit}
                </p>
              </div>
              <button type="button" onClick={() => setEditingSale(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {editItems.map((item) => {
                const selectedProduct = activeProducts.find((product) => product.id === item.productId) || activeProducts[0];
                const variants = selectedProduct?.variants || [];

                return (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_0.6fr_0.8fr_auto] gap-2 bg-[#111111] border border-[#222222] rounded-xl p-3 text-xs items-end">
                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Peça</label>
                      <select
                        value={selectedProduct?.id || ''}
                        onChange={(e) => {
                          const product = activeProducts.find((p) => p.id === e.target.value);
                          if (!product) return;
                          updateEditItem(item.id, product.id, product.variants[0]?.id || '', item.quantity);
                        }}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-white focus:outline-none focus:border-[#F97316]"
                      >
                        {activeProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Tamanho</label>
                      <select
                        value={item.variantId || variants[0]?.id || ''}
                        onChange={(e) => updateEditItem(item.id, selectedProduct.id, e.target.value, item.quantity)}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-[#F97316]"
                      >
                        {variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.size}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Qtd</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateEditItem(item.id, selectedProduct.id, item.variantId || variants[0]?.id || '', Number(e.target.value))
                        }
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-white font-bold focus:outline-none focus:border-[#F97316]"
                      />
                    </div>

                    <div>
                      <span className="block text-gray-400 mb-1 font-semibold">Status</span>
                      <span className="block bg-gray-800 text-gray-200 rounded px-2 py-2 font-mono uppercase">
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditItems((prev) => prev.filter((i) => i.id !== item.id))}
                      disabled={editItems.length === 1}
                      className="p-2 bg-[#1a1a1a] hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded border border-[#333333] disabled:opacity-40"
                      title="Remover item da venda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addEditItem}
              className="flex items-center space-x-1.5 bg-[#222222] hover:bg-[#333333] text-gray-200 text-xs px-3 py-2 rounded-lg border border-gray-700"
            >
              <Plus className="w-4 h-4 text-[#F97316]" />
              <span>Adicionar Peça</span>
            </button>

            <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal atualizado:</span>
                <span>R$ {formatCurrency(editItems.reduce((total, item) => total + item.totalPrice, 0))}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-2 border-t border-[#222222]">
                <span>Total com desconto/acréscimo original:</span>
                <span className="text-[#F97316]">
                  R$ {formatCurrency(Math.max(0, editItems.reduce((total, item) => total + item.totalPrice, 0) - editingSale.discount + editingSale.addition))}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#2e2e2e] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs rounded"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {paymentModalSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleConfirmPayment} className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white border-b border-[#2e2e2e] pb-3">
              Registrar Pagamento: {paymentModalSale.code}
            </h3>

            <div className="bg-[#111111] border border-[#222222] rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Total:</span>
                <span className="text-white font-bold">R$ {formatCurrency(paymentModalSale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Já pago:</span>
                <span className="text-emerald-400 font-bold">R$ {formatCurrency(paymentModalSale.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Restante:</span>
                <span className="text-[#F97316] font-bold">R$ {formatCurrency(paymentModalSale.pendingAmount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Forma de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as PaymentMethod);
                  setCardholderIsMember(true);
                  setCardholderName('');
                }}
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316]"
              >
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de crédito">Cartão de Crédito</option>
                <option value="Cartão de débito">Cartão de Débito</option>
                <option value="Transferência">Transferência Bancária</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {paymentMethod === 'Cartão de crédito' && (
              <div className="space-y-2 bg-[#111111] border border-[#333333] rounded-xl p-3">
                <span className="block text-[10px] font-bold text-amber-400 uppercase">Titular do Cartão</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardholderIsMember}
                    onChange={(e) => {
                      setCardholderIsMember(e.target.checked);
                      if (e.target.checked) setCardholderName('');
                    }}
                    className="accent-[#F97316]"
                  />
                  <span className="text-xs text-gray-300">O próprio membro é o titular do cartão</span>
                </label>
                {!cardholderIsMember && (
                  <input
                    type="text"
                    placeholder="Nome do titular do cartão"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Valor Pago (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                onBlur={(e) => setPaymentAmount(normalizeCurrencyInput(e.target.value))}
                placeholder="0,00"
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-[#2e2e2e] flex items-center justify-end space-x-2">
              <button type="button" onClick={() => setPaymentModalSale(null)} className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700">
                Voltar
              </button>
              <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded">
                Confirmar Pagamento
              </button>
            </div>
          </form>
        </div>
      )}

      {cancelModalSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleConfirmCancel} className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white border-b border-[#2e2e2e] pb-3">
              Cancelar Venda: {cancelModalSale.code}
            </h3>

            <p className="text-xs text-gray-300">
              O cancelamento irá liberar as reservas no estoque e registrar a ação na auditoria do sistema.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Justificativa do Cancelamento *</label>
              <textarea
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 h-20"
              />
            </div>

            <div className="pt-3 border-t border-[#2e2e2e] flex items-center justify-end space-x-2">
              <button type="button" onClick={() => setCancelModalSale(null)} className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700">
                Voltar
              </button>
              <button type="submit" className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded">
                Confirmar Cancelamento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
