import React, { useState } from 'react';
import { Product, ProductCategory, ProductVariant } from '../types';
import { ShoppingBag, Plus, Edit2, Layers, AlertTriangle, X, Tag } from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  categories: ProductCategory[];
  referenceSizes: string[];
  onAddProduct: (newP: Product) => void;
  onUpdateProduct: (updatedP: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  referenceSizes,
  onAddProduct,
  onUpdateProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    description: '',
    categoryId: categories[0]?.id || '',
    supplierName: 'Uniformização Desbravadores Brasil',
    basePrice: 45.0,
    costPrice: 28.0,
    controlStock: true,
    allowSaleWithoutStock: true,
    minStock: 5,
    active: true,
    variants: []
  });

  const filtered = products.filter((p) => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
    }
    return true;
  });

  const openCreateModal = () => {
    setFormData({
      name: '',
      sku: `PROD-${Date.now().toString().slice(-4)}`,
      description: '',
      categoryId: categories[0]?.id || '',
      supplierName: 'Uniformização Desbravadores Brasil',
      basePrice: 45.0,
      costPrice: 28.0,
      controlStock: true,
      allowSaleWithoutStock: true,
      minStock: 5,
      active: true,
      variants: referenceSizes.slice(0, 5).map((sz, idx) => ({
        id: `v-new-${idx}`,
        sku: `SKU-${sz.replace(/\s+/g, '')}`,
        size: sz,
        price: 45.0,
        costPrice: 28.0,
        physicalStock: 10,
        reservedStock: 0
      }))
    });
    setIsCreating(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData(p);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const categoryObj = categories.find((c) => c.id === formData.categoryId);

    if (isCreating) {
      const newP: Product = {
        ...(formData as Product),
        id: `prod-${Date.now()}`,
        code: `P-${String(products.length + 1).padStart(3, '0')}`,
        categoryName: categoryObj?.name || 'Geral',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onAddProduct(newP);
      setIsCreating(false);
    } else if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        ...formData,
        categoryName: categoryObj?.name || editingProduct.categoryName,
        updatedAt: new Date().toISOString()
      };
      onUpdateProduct(updated);
      setEditingProduct(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-[#F97316]" />
            <span>Catálogo de Produtos e Tamanhos</span>
          </h2>
          <p className="text-xs text-gray-400">
            Cadastre peças de uniformes, acessórios e configure estoques por tamanho
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-1.5 bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-[#111111] border border-[#222222] p-3 rounded-xl">
        <input
          type="text"
          placeholder="Pesquisar por nome, SKU ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#F97316] flex-1"
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
        >
          <option value="all">Todas as Categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const totalStock = p.variants.reduce((a, v) => a + v.physicalStock, 0);
          const totalReserved = p.variants.reduce((a, v) => a + v.reservedStock, 0);
          const available = totalStock - totalReserved;

          return (
            <div
              key={p.id}
              className="bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#F97316]/50 rounded-xl p-5 space-y-4 transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#F97316] bg-[#F97316]/10 px-2 py-0.5 rounded">
                    {p.code}
                  </span>
                  <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                    {p.categoryName}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base">{p.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-2">{p.description || 'Sem descrição cadastrada.'}</p>
              </div>

              {/* Price & Stock summary */}
              <div className="space-y-3 pt-3 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Preço de Venda</span>
                    <span className="text-base font-black text-white">
                      R$ {p.basePrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block">Custo Estimado</span>
                    <span className="text-xs text-gray-400 font-mono">
                      R$ {p.costPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Variants stock badges */}
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 block font-semibold">Tamanhos e Estoque:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {p.variants.map((v) => {
                      const availV = v.physicalStock - v.reservedStock;
                      return (
                        <div
                          key={v.id}
                          className={`text-[10px] font-mono px-2 py-1 rounded border flex items-center space-x-1 ${
                            availV > 0
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-red-500/10 border-red-500/30 text-red-300'
                          }`}
                        >
                          <span className="font-bold">{v.size}:</span>
                          <span>{availV} disp</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => openEditModal(p)}
                  className="flex items-center space-x-1.5 text-xs text-gray-300 hover:text-[#F97316] bg-[#111111] hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-[#333333] transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Produto</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create or Edit Product */}
      {(isCreating || editingProduct) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveProduct}
            className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-2xl w-full p-6 space-y-4 relative max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingProduct(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white border-b border-[#2e2e2e] pb-3">
              {isCreating ? 'Cadastrar Novo Produto' : `Editar Produto: ${editingProduct?.code}`}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1 font-semibold">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Categoria *</label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Fornecedor</label>
                <input
                  type="text"
                  value={formData.supplierName || ''}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Preço de Venda (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.basePrice || 0}
                  onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Custo de Compra (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.costPrice || 0}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>
            </div>

            {/* Variants table */}
            <div className="space-y-2 pt-2 border-t border-[#2e2e2e]">
              <h4 className="text-xs font-bold text-[#F97316] uppercase tracking-wider">
                Tamanhos e Estoques Físicos
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(formData.variants || []).map((v, idx) => (
                  <div
                    key={v.id || idx}
                    className="grid grid-cols-3 gap-2 bg-[#111111] p-2 rounded border border-[#222222] text-xs items-center"
                  >
                    <div className="font-bold text-white">{v.size}</div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Estoque Físico:</span>
                      <input
                        type="number"
                        value={v.physicalStock}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const nextV = [...(formData.variants || [])];
                          nextV[idx].physicalStock = val;
                          setFormData({ ...formData, variants: nextV });
                        }}
                        className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Reservado:</span>
                      <span className="font-mono text-amber-400 font-bold">{v.reservedStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#2e2e2e] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F97316] text-black font-bold text-xs rounded hover:bg-orange-400"
              >
                Salvar Produto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
