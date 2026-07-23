import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  fetchProductSizes,
  addProductSize,
  updateProductSize,
  deleteProductSize,
  ProductSize
} from '../lib/supabaseDb';

interface ProductSizesManagerProps {
  productId?: string;
  productName: string;
  initialSizes?: ProductSize[];
  onSizesChange?: (sizes: ProductSize[]) => void;
  onClose: () => void;
}

export const ProductSizesManager: React.FC<ProductSizesManagerProps> = ({
  productId,
  productName,
  initialSizes = [],
  onSizesChange,
  onClose
}) => {
  const [sizes, setSizes] = useState<ProductSize[]>(initialSizes);
  const [loading, setLoading] = useState(Boolean(productId));
  const [newSizeName, setNewSizeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (productId) {
      loadSizes();
    } else {
      setSizes(initialSizes);
      setLoading(false);
    }
  }, [productId]);

  const loadSizes = async () => {
    if (!productId) return;
    setLoading(true);
    const data = await fetchProductSizes(productId);
    const loadedSizes = data || [];
    setSizes(loadedSizes);
    onSizesChange?.(loadedSizes);
    setLoading(false);
  };

  const updateLocalSizes = (nextSizes: ProductSize[]) => {
    setSizes(nextSizes);
    onSizesChange?.(nextSizes);
  };

  const handleAddSize = async () => {
    if (!newSizeName.trim()) return;

    if (sizes.some((size) => size.sizeName.toLowerCase() === newSizeName.trim().toLowerCase())) {
      alert('Este tamanho já foi cadastrado para o produto.');
      return;
    }

    const maxOrder = sizes.length > 0 ? Math.max(...sizes.map(s => s.sizeOrder)) : 0;
    if (!productId) {
      updateLocalSizes([
        ...sizes,
        {
          id: `local-size-${Date.now()}`,
          productId: '',
          sizeName: newSizeName.trim(),
          sizeOrder: maxOrder + 1,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
      setNewSizeName('');
      return;
    }

    const success = await addProductSize(productId, newSizeName.trim(), maxOrder + 1);

    if (success) {
      setNewSizeName('');
      await loadSizes();
    }
  };

  const handleUpdateSize = async (id: string) => {
    if (!editingName.trim()) return;

    if (sizes.some((size) => size.id !== id && size.sizeName.toLowerCase() === editingName.trim().toLowerCase())) {
      alert('Este tamanho já foi cadastrado para o produto.');
      return;
    }

    if (!productId) {
      updateLocalSizes(
        sizes.map((size) =>
          size.id === id ? { ...size, sizeName: editingName.trim(), updatedAt: new Date().toISOString() } : size
        )
      );
      setEditingId(null);
      setEditingName('');
      return;
    }

    const success = await updateProductSize(id, editingName.trim());
    if (success) {
      setEditingId(null);
      setEditingName('');
      await loadSizes();
    }
  };

  const handleDeleteSize = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este tamanho?')) {
      if (!productId) {
        updateLocalSizes(sizes.filter((size) => size.id !== id));
        return;
      }

      const success = await deleteProductSize(id);
      if (success) {
        await loadSizes();
      }
    }
  };

  const handleMoveUp = async (size: ProductSize, index: number) => {
    if (index === 0) return;
    const prevSize = sizes[index - 1];
    if (!productId) {
      const nextSizes = [...sizes];
      nextSizes[index - 1] = { ...size, sizeOrder: prevSize.sizeOrder };
      nextSizes[index] = { ...prevSize, sizeOrder: size.sizeOrder };
      updateLocalSizes(nextSizes);
      return;
    }
    await updateProductSize(size.id, undefined, prevSize.sizeOrder);
    await updateProductSize(prevSize.id, undefined, size.sizeOrder);
    await loadSizes();
  };

  const handleMoveDown = async (size: ProductSize, index: number) => {
    if (index === sizes.length - 1) return;
    const nextSize = sizes[index + 1];
    if (!productId) {
      const nextSizes = [...sizes];
      nextSizes[index] = { ...nextSize, sizeOrder: size.sizeOrder };
      nextSizes[index + 1] = { ...size, sizeOrder: nextSize.sizeOrder };
      updateLocalSizes(nextSizes);
      return;
    }
    await updateProductSize(size.id, undefined, nextSize.sizeOrder);
    await updateProductSize(nextSize.id, undefined, size.sizeOrder);
    await loadSizes();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-xl shadow-lg p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-white">Gerenciar Tamanhos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">Produto: {productName}</p>

        {loading ? (
          <div className="text-center text-xs text-gray-400 py-4">Carregando...</div>
        ) : (
          <>
            {/* Lista de tamanhos */}
            <div className="mb-4 space-y-2">
              {sizes.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum tamanho cadastrado</p>
              ) : (
                sizes.map((size, index) => (
                  <div
                    key={size.id}
                    className="flex items-center gap-2 p-2 bg-[#111111] rounded border border-[#2e2e2e]"
                  >
                    <div className="flex-1">
                      {editingId === size.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-2 py-1 bg-[#1a1a1a] border border-[#333333] rounded text-white text-sm"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-white">{size.sizeName}</span>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {editingId === size.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateSize(size.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500"
                            title="Salvar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingName('');
                            }}
                            className="p-1.5 bg-gray-700 text-white rounded hover:bg-gray-600"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(size.id);
                              setEditingName(size.sizeName);
                            }}
                            className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-500"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveUp(size, index)}
                            disabled={index === 0}
                            className="p-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-40"
                            title="Mover para cima"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(size, index)}
                            disabled={index === sizes.length - 1}
                            className="p-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-40"
                            title="Mover para baixo"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSize(size.id)}
                            className="p-1.5 bg-red-700 text-white rounded hover:bg-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Adicionar novo tamanho */}
            <div className="border-t border-[#2e2e2e] pt-4">
              <label className="block text-xs text-gray-300 font-semibold mb-2">Adicionar novo tamanho:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  placeholder="Ex: GG, Tall, M-Slim..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSize();
                  }}
                  className="flex-1 px-3 py-2 bg-[#111111] border border-[#333333] rounded text-sm text-white"
                />
                <button
                  onClick={handleAddSize}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#F97316] text-black font-bold rounded text-xs hover:bg-orange-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
