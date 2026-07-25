import React, { useState } from 'react';
import { Kit, Product } from '../types';
import { Box, Plus, Edit2, Layers, CheckCircle2, Tag } from 'lucide-react';
import { currencyInputValue, formatCurrency, normalizeCurrencyInput, parseCurrencyInput } from '../lib/currency';

interface KitsViewProps {
  kits: Kit[];
  products: Product[];
  onAddKit: (newKit: Kit) => void;
}

export const KitsView: React.FC<KitsViewProps> = ({ kits, products, onAddKit }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [kitName, setKitName] = useState('');
  const [kitPriceInput, setKitPriceInput] = useState(currencyInputValue(260));
  const [kitDesc, setKitDesc] = useState('');

  const handleCreateKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitName) return;
    const kitPrice = parseCurrencyInput(kitPriceInput);

    const newKit: Kit = {
      id: `kit-${Date.now()}`,
      code: `KIT-${String(kits.length + 1).padStart(3, '0')}`,
      name: kitName,
      description: kitDesc || 'Kit oficial com uniforme e acessórios.',
      price: kitPrice,
      originalPrice: kitPrice + 35.0,
      discount: 35.0,
      active: true,
      items: [
        { id: 'ki-1', productId: products[0]?.id || '', productName: products[0]?.name || 'Camisa', quantity: 2, required: true },
        { id: 'ki-2', productId: products[1]?.id || '', productName: products[1]?.name || 'Calça', quantity: 1, required: true }
      ],
      createdAt: new Date().toISOString()
    };

    onAddKit(newKit);
    setIsCreating(false);
    setKitName('');
    setKitPriceInput(currencyInputValue(260));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Box className="w-5 h-5 text-[#F97316]" />
            <span>Kits Promocionais de Uniformes</span>
          </h2>
          <p className="text-xs text-gray-400">
            Kits integrados. Permitem escolha individual do tamanho de cada peça no momento da venda.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-1.5 bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Kit</span>
        </button>
      </div>

      {/* Kits Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kits.map((k) => (
          <div
            key={k.id}
            className="bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#F97316]/50 rounded-2xl p-6 space-y-4 transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#F97316] bg-[#F97316]/10 px-2.5 py-1 rounded-md">
                {k.code}
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                Desconto: R$ {formatCurrency(k.discount)}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">{k.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{k.description}</p>
            </div>

            {/* Price Box */}
            <div className="bg-[#111111] p-3 rounded-xl border border-[#222222] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 block">Preço Promocional do Kit</span>
                <span className="text-xl font-black text-[#F97316]">R$ {formatCurrency(k.price)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 block">Preço Separado</span>
                <span className="text-xs text-gray-400 line-through font-mono">
                  R$ {formatCurrency(k.originalPrice)}
                </span>
              </div>
            </div>

            {/* Items Included */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-300 block">Peças Incluídas no Kit:</span>
              <div className="space-y-1.5">
                {k.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between bg-[#111111] px-3 py-2 rounded-lg text-xs text-gray-300 border border-[#222222]"
                  >
                    <span className="font-semibold text-white">{it.productName}</span>
                    <span className="font-mono text-amber-400 font-bold">{it.quantity}x unidades</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Kit */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateKit}
            className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white border-b border-[#2e2e2e] pb-3">
              Criar Novo Kit de Uniforme
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Nome do Kit *</label>
              <input
                type="text"
                required
                value={kitName}
                onChange={(e) => setKitName(e.target.value)}
                placeholder="ex: Kit Verão Desbravadores"
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Preço Promocional (R$) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={kitPriceInput}
                onChange={(e) => setKitPriceInput(e.target.value)}
                onBlur={(e) => setKitPriceInput(normalizeCurrencyInput(e.target.value))}
                placeholder="0,00"
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Descrição</label>
              <textarea
                value={kitDesc}
                onChange={(e) => setKitDesc(e.target.value)}
                placeholder="Detalhes dos itens incluídos..."
                className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316] h-20"
              />
            </div>

            <div className="pt-3 border-t border-[#2e2e2e] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F97316] text-black font-bold text-xs rounded hover:bg-orange-400"
              >
                Salvar Kit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
