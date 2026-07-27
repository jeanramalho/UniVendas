import React, { useEffect, useMemo, useState } from 'react';
import {
  Member,
  Product,
  Kit,
  Sale,
  SaleItem,
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
  SaleItemStatus
} from '../types';
import {
  ShoppingCart,
  Search,
  UserCheck,
  Plus,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { logAuditEvent } from '../lib/audit';
import { formatCurrency, normalizeCurrencyInput, parseCurrencyInput } from '../lib/currency';

const createId = () => crypto.randomUUID();

interface NewSaleViewProps {
  members: Member[];
  products: Product[];
  kits: Kit[];
  onCompleteSale: (newSale: Sale) => void;
  userName: string;
}

export const NewSaleView: React.FC<NewSaleViewProps> = ({
  members,
  products,
  kits,
  onCompleteSale,
  userName
}) => {
  // Selected Member
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Cart Items
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);

  // Item selector state
  const availableProducts = useMemo(
    () => products.filter((product) => product.active !== false && product.variants.length > 0),
    [products]
  );
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [itemQty, setItemQty] = useState(1);

  // Kit selector state
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);
  const [kitComponentSizes, setKitComponentSizes] = useState<Record<string, string>>({});

  // Payment State
  const [discountInput, setDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleCompleted, setSaleCompleted] = useState<Sale | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [cardholderIsMember, setCardholderIsMember] = useState(true);

  const selectedProduct = availableProducts.find((product) => product.id === selectedProductId) || null;

  useEffect(() => {
    if (!selectedProductId && availableProducts.length > 0) {
      setSelectedProductId(availableProducts[0].id);
      setSelectedVariantId(availableProducts[0].variants[0]?.id || '');
      return;
    }

    const currentProduct = availableProducts.find((product) => product.id === selectedProductId);
    if (!currentProduct) {
      setSelectedProductId(availableProducts[0]?.id || '');
      setSelectedVariantId(availableProducts[0]?.variants[0]?.id || '');
      return;
    }

    if (!currentProduct.variants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantId(currentProduct.variants[0]?.id || '');
    }
  }, [availableProducts, selectedProductId, selectedVariantId]);

  // Filter members search dropdown
  const filteredMembers = memberSearch.trim()
    ? members.filter((m) => {
        const t = memberSearch.toLowerCase();
        return (
          m.name.toLowerCase().includes(t) ||
          m.internalCode.toLowerCase().includes(t) ||
          m.unit.toLowerCase().includes(t) ||
          m.cellphone.includes(t)
        );
      }).slice(0, 6)
    : [];

  const handleAddProductToCart = () => {
    if (!selectedProduct) return;
    const variant = selectedProduct.variants.find((v) => v.id === selectedVariantId) || selectedProduct.variants[0];
    if (!variant) return;

    const availableStock = Math.max(0, variant.physicalStock - variant.reservedStock);
    if (!selectedProduct.allowSaleWithoutStock && availableStock < itemQty) {
      alert('Este produto não permite venda sem estoque.');
      return;
    }

    const existingIndex = cartItems.findIndex(
      (i) => !i.isKit && i.productId === selectedProduct.id && i.variantId === variant.id
    );

    if (existingIndex >= 0) {
      const updatedCart = [...cartItems];
      const existing = updatedCart[existingIndex];
      const newQty = existing.quantity + itemQty;
      updatedCart[existingIndex] = {
        ...existing,
        quantity: newQty,
        totalPrice: variant.price * newQty
      };
      setCartItems(updatedCart);
    } else {
      // Items start as aguardando_pagamento — status will change after payment
      const itemStatus: SaleItemStatus = 'aguardando_pagamento';

      const newItem: SaleItem = {
        id: createId(),
        saleId: '',
        isKit: false,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        variantId: variant.id,
        size: variant.size,
        quantity: itemQty,
        unitPrice: variant.price,
        totalPrice: variant.price * itemQty,
        status: itemStatus
      };

      setCartItems([...cartItems, newItem]);
    }
    setItemQty(1);
  };

  const handleAddKitToCart = () => {
    if (!selectedKit) return;

    const newItem: SaleItem = {
      id: createId(),
      saleId: '',
      isKit: true,
      kitId: selectedKit.id,
      productName: selectedKit.name,
      size: 'Kit Variado',
      quantity: 1,
      unitPrice: selectedKit.price,
      totalPrice: selectedKit.price,
      status: 'aguardando_pagamento', // Kit status determined after payment
      components: selectedKit.items.map((ki) => {
        const p = products.find((pr) => pr.id === ki.productId);
        const chosenSize = kitComponentSizes[ki.id] || p?.variants[0]?.size || '';
        const variant = p?.variants.find((v) => v.size === chosenSize) || p?.variants[0];

        return {
          id: createId(),
          productId: ki.productId,
          productName: ki.productName,
          variantId: variant?.id || '',
          size: chosenSize,
          quantity: ki.quantity,
          unitPrice: p?.basePrice || 45.0,
          status: 'aguardando_pagamento' as SaleItemStatus // will be updated after payment
        };
      })
    };

    setCartItems([...cartItems, newItem]);
    setSelectedKit(null);
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems(cartItems.filter((i) => i.id !== id));
  };

  // Financial totals
  const subtotal = cartItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const discount = parseCurrencyInput(discountInput);
  const paidAmount = parseCurrencyInput(paidAmountInput);
  const totalAmount = Math.max(0, subtotal - discount);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  let paymentStatus: PaymentStatus = 'a_pagar';
  if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = 'pago';
  } else if (paidAmount > 0) {
    paymentStatus = 'parcialmente_pago';
  }

  const handleFinalizeSale = () => {
    if (!selectedMember) return;
    if (cartItems.length === 0) return;

    // Check overall sale status
    let overallStatus: SaleStatus = 'aguardando_pagamento';
    if (paymentStatus === 'pago') {
      const hasMissingStock = cartItems.some((i) => i.status === 'pedido_a_fazer');
      overallStatus = hasMissingStock ? 'aguardando_pedido' : 'parcialmente_disponivel';
    }

    const saleCode = `V-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 8999) + 1000)}`;

    const saleId = createId();
    const newSale: Sale = {
      id: saleId,
      code: saleCode,
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      memberUnit: selectedMember.unit,
      memberPhone: selectedMember.cellphone,
      items: cartItems.map((i) => ({ ...i, saleId })),
      subtotal,
      discount,
      addition: 0,
      totalAmount,
      paidAmount,
      pendingAmount,
      paymentStatus,
      overallStatus,
      payments:
        paidAmount > 0
          ? [
              {
                id: createId(),
                saleId,
                amount: paidAmount,
                method: paymentMethod,
                status: paymentStatus,
                paidAt: new Date().toISOString(),
                registeredBy: userName,
                createdAt: new Date().toISOString(),
                ...(paymentMethod === 'Cartão de crédito' ? {
                  cardholderName: cardholderIsMember ? selectedMember!.name : cardholderName,
                  cardholderIsMember
                } : {})
              }
            ]
          : [],
      notes: saleNotes,
      createdBy: userName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCompleteSale(newSale);
    logAuditEvent(
      'usr-current',
      userName,
      'CRIAR_VENDA',
      'sales',
      `Venda ${saleCode} para ${selectedMember.name} no valor de R$ ${formatCurrency(totalAmount)}`
    );

    setSaleCompleted(newSale);
  };

  const handleResetForm = () => {
    setSelectedMember(null);
    setCartItems([]);
    setDiscountInput('');
    setPaidAmountInput('');
    setMemberSearch('');
    setSaleCompleted(null);
    setCardholderName('');
    setCardholderIsMember(true);
  };

  if (saleCompleted) {
    return (
      <div className="max-w-xl mx-auto bg-[#1a1a1a] border border-[#2e2e2e] p-8 rounded-2xl text-center space-y-6 shadow-2xl">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
        <div>
          <span className="text-xs text-gray-400 uppercase font-mono tracking-wider">
            Venda Registrada com Sucesso
          </span>
          <h2 className="text-3xl font-black text-white mt-1 font-mono text-[#F97316]">
            {saleCompleted.code}
          </h2>
        </div>

        <div className="bg-[#111111] p-4 rounded-xl text-left text-xs space-y-2 border border-[#222222]">
          <div className="flex justify-between">
            <span className="text-gray-400">Membro:</span>
            <span className="font-bold text-white">{saleCompleted.memberName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Unidade:</span>
            <span className="text-gray-300">{saleCompleted.memberUnit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Valor Total:</span>
            <span className="font-bold text-[#F97316]">R$ {formatCurrency(saleCompleted.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Status Pagamento:</span>
            <span className="font-bold text-emerald-400 uppercase">{saleCompleted.paymentStatus}</span>
          </div>
        </div>

        <button
          onClick={handleResetForm}
          className="w-full bg-[#F97316] hover:bg-orange-400 text-black font-bold py-3 rounded-xl transition shadow-lg text-sm"
        >
          Iniciar Outra Venda
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5 text-[#F97316]" />
          <span>Nova Venda — Balcão do Clube</span>
        </h2>
        <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-full font-semibold">
          Regra Mestre: Venda Obrigatória para Membro Cadastrado
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Member & Item Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Mandatory Member Selection */}
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-[#F97316]" />
              <span>1. Selecionar Membro do Clube *</span>
            </h3>

            {!selectedMember ? (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Pesquisar membro por nome, código, unidade ou celular..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full bg-[#111111] border border-[#333333] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#F97316]"
                />

                {filteredMembers.length > 0 && (
                  <div className="absolute left-0 right-0 top-12 bg-[#111111] border border-[#333333] rounded-xl shadow-2xl z-20 divide-y divide-[#222222] max-h-60 overflow-y-auto">
                    {filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          setMemberSearch('');
                        }}
                          className="p-3 hover:bg-[#F97316]/10 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{m.name}</div>
                          <div className="text-[11px] text-gray-400">
                            {m.unit} • Tel: {m.cellphone}
                          </div>
                        </div>
                        <span className="font-mono text-amber-400 bg-gray-800 px-2 py-0.5 rounded text-[10px]">
                          Tam Ref: {m.referenceSize}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Member Card */
              <div className="bg-[#111111] border border-[#F97316]/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-3 bg-[#F97316]/20 text-[#F97316] rounded-xl font-bold font-mono">
                    {selectedMember.internalCode}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{selectedMember.name}</h4>
                    <p className="text-xs text-gray-400">
                      {selectedMember.unit} • Responsável: {selectedMember.responsibleName}
                    </p>
                    <div className="mt-1 inline-block bg-amber-500/10 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
                      Tamanho de Referência Visual: {selectedMember.referenceSize}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded bg-gray-800 self-start sm:self-auto shrink-0"
                >
                  Trocar Membro
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Add Item or Kit to Cart */}
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Plus className="w-4 h-4 text-[#F97316]" />
              <span>2. Adicionar Itens ou Kits à Venda</span>
            </h3>

            {/* Individual Product Selector */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-[#111111] p-3.5 rounded-xl border border-[#222222] items-end">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Produto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const p = products.find((pr) => pr.id === e.target.value);
                    if (p) {
                      setSelectedProductId(p.id);
                      setSelectedVariantId(p.variants[0]?.id || '');
                    }
                  }}
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-white focus:outline-none"
                >
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (R$ {formatCurrency(p.basePrice)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Tamanho Desejado</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-white focus:outline-none font-bold text-amber-300"
                >
                  {selectedProduct?.variants.map((v) => {
                    const avail = Math.max(0, v.physicalStock - v.reservedStock);
                    return (
                      <option key={v.id} value={v.id}>
                        {v.size} — {avail > 0 ? `${avail} em estoque` : 'Sem estoque (A Pedir)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-white focus:outline-none font-bold"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleAddProductToCart}
                  disabled={!selectedMember || !selectedProduct || !selectedVariantId}
                  className="w-full bg-[#F97316] hover:bg-orange-400 text-black font-bold py-2 rounded transition text-xs disabled:opacity-40"
                >
                  + Adicionar Peça
                </button>
              </div>
            </div>

            {/* Kit Selector Option */}
            <div className="bg-[#111111] p-3.5 rounded-xl border border-[#222222] space-y-3">
              <span className="text-xs font-bold text-amber-400 block uppercase">
                Ou Selecionar Kit Promocional Completo:
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <select
                  value={selectedKit?.id || ''}
                  onChange={(e) => {
                    const k = kits.find((kt) => kt.id === e.target.value);
                    setSelectedKit(k || null);
                  }}
                  className="bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none flex-1 min-w-0"
                >
                  <option value="">Selecione um kit...</option>
                  {kits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} (R$ {formatCurrency(k.price)})
                    </option>
                  ))}
                </select>

                {selectedKit && (
                  <button
                    onClick={handleAddKitToCart}
                    disabled={!selectedMember}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2 rounded transition disabled:opacity-40"
                  >
                    + Adicionar Kit
                  </button>
                )}
              </div>

              {/* Kit component sizes selector if selected */}
              {selectedKit && (
                <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg border border-amber-500/30 space-y-2">
                  <span className="text-[11px] text-gray-300 font-semibold block">
                    Escolha o Tamanho de Cada Componente do Kit:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedKit.items.map((ki) => {
                      const p = products.find((pr) => pr.id === ki.productId);
                      return (
                        <div key={ki.id} className="space-y-1">
                          <span className="text-gray-400 block text-[10px]">{ki.productName}:</span>
                          <select
                            value={kitComponentSizes[ki.id] || p?.variants[0]?.size || 'Adulto M'}
                            onChange={(e) =>
                              setKitComponentSizes({ ...kitComponentSizes, [ki.id]: e.target.value })
                            }
                            className="w-full bg-[#111111] border border-[#333333] rounded px-2 py-1 text-white font-bold text-amber-300"
                          >
                            {p?.variants.map((v) => (
                              <option key={v.id} value={v.size}>
                                {v.size} - {Math.max(0, v.physicalStock - v.reservedStock) > 0 ? `${Math.max(0, v.physicalStock - v.reservedStock)} em estoque` : 'Sem estoque (A Pedir)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Cart Summary & Payment */}
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-[#2e2e2e] pb-3">
              <span>Carrinho ({cartItems.length})</span>
              <span className="text-xs text-gray-400 font-normal">Itens Selecionados</span>
            </h3>

            {cartItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                Nenhum item adicionado ao carrinho ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#111111] border border-[#222222] p-3 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{item.productName}</div>
                      <div className="text-[11px] text-gray-400">
                        Tam: <span className="text-amber-400 font-bold">{item.size}</span> • {item.quantity}x
                      </div>
                      {/* Real time availability badge */}
                      <div className="mt-1">
                        {item.status === 'reservado' ? (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                            Disponível em Estoque
                          </span>
                        ) : (
                          <span className="text-[9px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-bold">
                            A Pedir ao Fornecedor
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-[#F97316]">
                        R$ {formatCurrency(item.totalPrice)}
                      </span>
                      <button
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="text-gray-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Totals Box */}
            <div className="bg-[#111111] p-4 rounded-xl border border-[#222222] space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal:</span>
                <span>R$ {formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center text-gray-400">
                <span>Desconto (R$):</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  onBlur={(e) => setDiscountInput(normalizeCurrencyInput(e.target.value))}
                  placeholder="0,00"
                  className="w-20 bg-[#1a1a1a] border border-[#333333] rounded px-2 py-0.5 text-right text-white font-mono"
                />
              </div>

              <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-[#222222]">
                <span>Total a Pagar:</span>
                <span className="text-[#F97316]">R$ {formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Fields */}
            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value as any);
                    setCardholderIsMember(true);
                    setCardholderName('');
                  }}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-white focus:outline-none"
                >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de crédito">Cartão de Crédito</option>
                  <option value="Cartão de débito">Cartão de Débito</option>
                  <option value="Transferência">Transferência Bancária</option>
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
                <label className="block text-gray-400 mb-1 font-semibold">Valor Efetivamente Pago (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  onBlur={(e) => setPaidAmountInput(normalizeCurrencyInput(e.target.value))}
                  placeholder="0,00"
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-white font-bold text-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleFinalizeSale}
              disabled={!selectedMember || cartItems.length === 0}
              className="w-full bg-[#F97316] hover:bg-orange-400 text-black font-bold py-3 rounded-xl transition shadow-lg text-sm disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>Concluir e Gravar Venda</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
