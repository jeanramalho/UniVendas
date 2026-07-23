import React, { useState } from 'react';
import { Product, ProductCategory, ProductVariant } from '../types';
import { ShoppingBag, Plus, Edit2, Layers, X, Trash2 } from 'lucide-react';
import { fetchProductSizes, ProductSize } from '../lib/supabaseDb';
import { ProductSizesManager } from '../components/ProductSizesManager';

interface ProductsViewProps {
  products: Product[];
  categories: ProductCategory[];
  onAddProduct: (newP: Product, sizeNames: string[]) => Promise<Product | void> | Product | void;
  onUpdateProduct: (updatedP: Product, sizeNames?: string[]) => Promise<Product | void> | Product | void;
  onDeleteProduct: (productId: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSizesManager, setShowSizesManager] = useState(false);
  const [sizesManagerProduct, setSizesManagerProduct] = useState<Product | null>(null);

  // Custom sizes for current product
  const [customSizes, setCustomSizes] = useState<ProductSize[]>([]);
  const [loadingCustomSizes, setLoadingCustomSizes] = useState(false);
  const [variantStocks, setVariantStocks] = useState<Record<string, number>>({});

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

  const loadCustomSizes = async (productId: string) => {
    setLoadingCustomSizes(true);
    const sizes = await fetchProductSizes(productId);
    setCustomSizes(sizes || []);
    setLoadingCustomSizes(false);
  };

  const buildVariantsFromSizes = (product: Product, sizes: ProductSize[]): ProductVariant[] => {
    const existingBySize = new Map(product.variants.map((variant) => [variant.size, variant]));

    return sizes.map((size) => {
      const existing = existingBySize.get(size.sizeName);
      const normalizedSize = size.sizeName.replace(/\s+/g, '').toUpperCase();

      return {
        id: existing?.id || `v-${Date.now()}-${size.id}`,
        sku: existing?.sku || `${product.sku || product.code || 'PROD'}-${normalizedSize}`,
        size: size.sizeName,
        color: existing?.color || '',
        model: existing?.model || '',
        gender: existing?.gender || 'Unissex',
        price: product.basePrice || existing?.price || 45.0,
        costPrice: product.costPrice || existing?.costPrice || 28.0,
        physicalStock: variantStocks[size.sizeName] ?? existing?.physicalStock ?? 0,
        reservedStock: existing?.reservedStock || 0
      };
    });
  };

  const openCreateModal = async () => {
    // For new products, start with no sizes, user will add via manager
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
      variants: []
    });
    setCustomSizes([]);
    setVariantStocks({});
    setIsCreating(true);
  };

  const openEditModal = async (p: Product) => {
    setEditingProduct(p);
    setFormData(p);
    setVariantStocks(
      p.variants.reduce<Record<string, number>>((acc, variant) => {
        acc[variant.size] = variant.physicalStock;
        return acc;
      }, {})
    );
    await loadCustomSizes(p.id);
  };

  const openSizesManager = (product: Product) => {
    setSizesManagerProduct(product);
    setShowSizesManager(true);
  };

  const handleSizesManagerClose = async () => {
    setShowSizesManager(false);

    if (sizesManagerProduct) {
      const savedSizes = await fetchProductSizes(sizesManagerProduct.id);
      const nextSizes = savedSizes || [];
      setCustomSizes(nextSizes);
      const updatedProduct = {
        ...sizesManagerProduct,
        variants: buildVariantsFromSizes(sizesManagerProduct, nextSizes),
        updatedAt: new Date().toISOString()
      };
      onUpdateProduct(updatedProduct, nextSizes.map((size) => size.sizeName));
    }

    setSizesManagerProduct(null);
    if (editingProduct) {
      loadCustomSizes(editingProduct.id);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Tem certeza que deseja EXCLUIR este produto? Esta ação não pode ser desfeita!')) {
      onDeleteProduct(productId);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Nome do produto é obrigatório');
      return;
    }

    if (customSizes.length === 0) {
      alert('Você deve adicionar pelo menos um tamanho ao produto. Clique em "Gerenciar Tamanhos"');
      return;
    }

    const categoryObj = categories.find((c) => c.id === formData.categoryId);

    const baseProduct = {
      ...(formData as Product),
      categoryName: categoryObj?.name || formData.categoryName || 'Geral'
    };
    const variants = buildVariantsFromSizes(baseProduct, customSizes);
    const sizeNames = customSizes.map((size) => size.sizeName);

    if (isCreating) {
      const newP: Product = {
        ...baseProduct,
        id: `prod-${Date.now()}`,
        code: `P-${String(products.length + 1).padStart(3, '0')}`,
        variants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await onAddProduct(newP, sizeNames);
      setIsCreating(false);
    } else if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        ...baseProduct,
        categoryName: categoryObj?.name || editingProduct.categoryName,
        variants,
        updatedAt: new Date().toISOString()
      };
      await onUpdateProduct(updated, sizeNames);
      setEditingProduct(null);
    }
    setCustomSizes([]);
    setVariantStocks({});
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

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2 justify-end">
                <button
                  onClick={() => openSizesManager(p)}
                  className="flex items-center space-x-1.5 text-xs text-gray-300 hover:text-blue-400 bg-[#111111] hover:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-[#333333] transition"
                  title="Gerenciar tamanhos"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Tamanhos</span>
                </button>
                <button
                  onClick={() => openEditModal(p)}
                  className="flex items-center space-x-1.5 text-xs text-gray-300 hover:text-[#F97316] bg-[#111111] hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-[#333333] transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => handleDeleteProduct(p.id)}
                  className="flex items-center space-x-1.5 text-xs text-red-300 hover:text-red-100 bg-red-900/10 hover:bg-red-900/30 px-3 py-1.5 rounded-lg border border-red-500/30 transition"
                  title="Deletar produto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Deletar</span>
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
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#F97316] uppercase tracking-wider">
                  Tamanhos e Estoques Físicos
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    if (editingProduct) {
                      openSizesManager(editingProduct);
                    } else {
                      setShowSizesManager(true);
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Gerenciar Tamanhos</span>
                </button>
              </div>

              {loadingCustomSizes ? (
                <div className="text-xs text-gray-400 py-4">Carregando tamanhos...</div>
              ) : customSizes.length === 0 ? (
                <div className="text-xs text-yellow-400 bg-yellow-900/20 p-3 rounded border border-yellow-500/30">
                  ⚠️ Nenhum tamanho cadastrado. Clique em "Gerenciar Tamanhos" para adicionar.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customSizes.map((size, idx) => (
                    <div
                      key={size.id}
                      className="grid grid-cols-3 gap-2 bg-[#111111] p-2 rounded border border-[#222222] text-xs items-center"
                    >
                      <div className="font-bold text-white">{size.sizeName}</div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Estoque Físico:</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={variantStocks[size.sizeName] ?? 0}
                          onChange={(e) => {
                            setVariantStocks({
                              ...variantStocks,
                              [size.sizeName]: Math.max(0, parseInt(e.target.value, 10) || 0)
                            });
                          }}
                          className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">Reservado:</span>
                        <span className="font-mono text-amber-400 font-bold">0</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Modal: Gerenciar Tamanhos */}
      {showSizesManager && (
        <ProductSizesManager
          productId={sizesManagerProduct?.id}
          productName={sizesManagerProduct?.name || formData.name || 'Novo produto'}
          initialSizes={customSizes}
          onSizesChange={setCustomSizes}
          onClose={handleSizesManagerClose}
        />
      )}
    </div>
  );
};
