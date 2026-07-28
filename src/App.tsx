import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';

// Views
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { MembersView } from './views/MembersView';
import { MemberImportView } from './views/MemberImportView';
import { MemberDuplicatesView } from './views/MemberDuplicatesView';
import { ProductsView } from './views/ProductsView';
import { KitsView } from './views/KitsView';
import { StockView } from './views/StockView';
import { NewSaleView } from './views/NewSaleView';
import { SalesListView } from './views/SalesListView';
import { PendingOrdersView } from './views/PendingOrdersView';
import { PurchaseBatchesView } from './views/PurchaseBatchesView';
import { BatchDetailView } from './views/BatchDetailView';
import { ConferenceView } from './views/ConferenceView';
import { DeliveriesView } from './views/DeliveriesView';
import { ReturnsView } from './views/ReturnsView';
import { FinancialView } from './views/FinancialView';
import { ReportsView } from './views/ReportsView';
import { UsersView } from './views/UsersView';
import { AuditView } from './views/AuditView';
import { SettingsView } from './views/SettingsView';

// Data & Helpers
import {
  CLUB_LOGO_URL,
  DESBRAVADORES_LOGO_URL,
  INITIAL_MEMBERS,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_KITS,
  INITIAL_SALES,
  INITIAL_BATCHES,
  INITIAL_USERS,
  INITIAL_SETTINGS
} from './data/initialData';
import {
  Member,
  Product,
  ProductCategory,
  Kit,
  Sale,
  Payment,
  PurchaseBatch,
  PurchaseBatchItem,
  User,
  AuditLog,
  DeliveryRecord,
  ReturnExchangeRecord,
  MemberDuplicateCase,
  AppSettings
} from './types';
import {
  fetchMembersFromSupabase,
  saveMembersToSupabase,
  saveSingleMemberToSupabase,
  deleteMemberFromSupabase,
  fetchProductsFromSupabase,
  saveProductToSupabase,
  deleteProductFromSupabase,
  saveProductSizesToSupabase,
  fetchSalesFromSupabase,
  saveSaleToSupabase,
  fetchCategoriesFromSupabase,
  saveCategoriesToSupabase,
  fetchAppSettingsFromSupabase,
  saveAppSettingsToSupabase,
  fetchKitsFromSupabase,
  saveKitToSupabase,
  fetchPurchaseBatchesFromSupabase,
  savePurchaseBatchToSupabase,
  saveUserToSupabase,
  fetchProfilesFromSupabase
} from './lib/supabaseDb';
import { getAuditLogs, logAuditEvent } from './lib/audit';

const normalizeSettingsLogos = (settings: AppSettings): AppSettings => {
  const isPlaceholderLogo = (value: string) => !value || value.includes('images.unsplash.com');

  return {
    ...settings,
    clubLogoUrl: isPlaceholderLogo(settings.clubLogoUrl) ? CLUB_LOGO_URL : settings.clubLogoUrl,
    desbravadoresLogoUrl: isPlaceholderLogo(settings.desbravadoresLogoUrl)
      ? DESBRAVADORES_LOGO_URL
      : settings.desbravadoresLogoUrl
  };
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout, authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<ProductCategory[]>(INITIAL_CATEGORIES);
  const [kits, setKits] = useState<Kit[]>(INITIAL_KITS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [batches, setBatches] = useState<PurchaseBatch[]>(INITIAL_BATCHES);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataReady, setDataReady] = useState(false);

  // Navigation State
  const [selectedBatch, setSelectedBatch] = useState<PurchaseBatch | null>(null);
  const [conferencingBatch, setConferencingBatch] = useState<PurchaseBatch | null>(null);
  const [duplicateCases, setDuplicateCases] = useState<MemberDuplicateCase[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const resolveVariantIdInApp = (
    currentProducts: Product[],
    productId?: string,
    productName?: string,
    variantId?: string,
    size?: string
  ): string | null => {
    const product =
      (productId ? currentProducts.find((p) => p.id === productId) : null) ||
      (productName ? currentProducts.find((p) => p.name.trim().toLowerCase() === productName.trim().toLowerCase()) : null);

    if (!product) return null;

    const variant =
      (variantId ? product.variants.find((v) => v.id === variantId) : null) ||
      (size ? product.variants.find((v) => v.size.trim().toLowerCase() === size.trim().toLowerCase()) : null) ||
      product.variants[0];

    return variant ? variant.id : null;
  };

  const isItemReservedStatus = (sale: Sale, itemStatus: string) => {
    if (itemStatus === 'reservado' || itemStatus === 'disponivel_entrega') return true;
    if (sale.paymentStatus === 'pago' && itemStatus === 'aguardando_pagamento') return true;
    return false;
  };

  const getSalePaymentTime = (sale: Sale): number => {
    if (sale.payments && sale.payments.length > 0) {
      const validTimes = sale.payments
        .map((p) => new Date(p.paidAt || p.createdAt).getTime())
        .filter((t) => !isNaN(t));
      if (validTimes.length > 0) {
        return Math.min(...validTimes);
      }
    }
    return new Date(sale.createdAt).getTime();
  };

  const syncAllReservedStock = (currentSales: Sale[], currentProducts: Product[], currentKits: Kit[] = kits) => {
    // Track physical stock remaining per variant for FIFO allocation pass
    const remainingPhysicalStock = new Map<string, number>();
    currentProducts.forEach((p) => {
      p.variants.forEach((v) => {
        remainingPhysicalStock.set(v.id, Math.max(0, v.physicalStock));
      });
    });

    // Sort active sales by payment status and chronological payment time (FIFO)
    const sortedSales = [...currentSales].sort((a, b) => getSalePaymentTime(a) - getSalePaymentTime(b));

    const reservedByVariant = new Map<string, number>();
    let salesChanged = false;

    const updatedSales = sortedSales.map((sale) => {
      // Rule: Canceled sales or sales with no payment recorded (paidAmount <= 0) DO NOT reserve any physical stock
      if (sale.overallStatus === 'cancelada' || sale.paidAmount <= 0) {
        let itemReset = false;
        const resetItems = sale.items.map((item) => {
          let itemUpdated = false;
          let newStatus = item.status;
          if (item.status === 'reservado' || item.status === 'pedido_a_fazer') {
            itemUpdated = true;
            itemReset = true;
            newStatus = 'aguardando_pagamento' as const;
          }

          let updatedComponents = item.components;
          if (item.isKit && item.components && item.components.length > 0) {
            updatedComponents = item.components.map((comp) => {
              if (comp.status === 'reservado' || comp.status === 'pedido_a_fazer') {
                itemUpdated = true;
                itemReset = true;
                return { ...comp, status: 'aguardando_pagamento' as const };
              }
              return comp;
            });
          }

          if (itemUpdated) {
            return { ...item, status: newStatus, components: updatedComponents };
          }
          return item;
        });

        if (itemReset) {
          salesChanged = true;
          const updatedSale = { ...sale, items: resetItems };
          void saveSaleToSupabase(updatedSale);
          return updatedSale;
        }
        return sale;
      }

      let saleItemChanged = false;

      const updatedItems = sale.items.map((item) => {
        // Items already delivered or manually checked in from supplier keep their status
        if (item.status === 'entregue' || item.status === 'disponivel_entrega') {
          if (item.status === 'disponivel_entrega') {
            const vId = resolveVariantIdInApp(currentProducts, item.productId, item.productName, item.variantId, item.size);
            if (vId) {
              const currentStock = remainingPhysicalStock.get(vId) || 0;
              remainingPhysicalStock.set(vId, Math.max(0, currentStock - item.quantity));
              reservedByVariant.set(vId, (reservedByVariant.get(vId) || 0) + item.quantity);
            }
          }
          return item;
        }

        if (!item.isKit) {
          const vId = resolveVariantIdInApp(currentProducts, item.productId, item.productName, item.variantId, item.size);
          if (vId) {
            const currentStock = remainingPhysicalStock.get(vId) || 0;
            if (currentStock >= item.quantity) {
              // FIFO Allocation: Paid order receives physical stock reservation
              remainingPhysicalStock.set(vId, currentStock - item.quantity);
              reservedByVariant.set(vId, (reservedByVariant.get(vId) || 0) + item.quantity);
              if (item.status !== 'reservado') {
                saleItemChanged = true;
                return { ...item, status: 'reservado' as const };
              }
            } else {
              // Stock exhausted for this variant: Order moves to supplier queue (pedido_a_fazer)
              if (item.status === 'reservado' || item.status === 'aguardando_pagamento') {
                saleItemChanged = true;
                return { ...item, status: 'pedido_a_fazer' as const };
              }
            }
          }
        } else {
          // Process kit components with FIFO stock allocation
          if (item.components && item.components.length > 0) {
            const updatedComponents = item.components.map((comp) => {
              if (comp.status === 'entregue' || comp.status === 'disponivel_entrega') {
                if (comp.status === 'disponivel_entrega') {
                  const vId = resolveVariantIdInApp(currentProducts, comp.productId, comp.productName, comp.variantId, comp.size);
                  if (vId) {
                    const currentStock = remainingPhysicalStock.get(vId) || 0;
                    remainingPhysicalStock.set(vId, Math.max(0, currentStock - comp.quantity));
                    reservedByVariant.set(vId, (reservedByVariant.get(vId) || 0) + comp.quantity);
                  }
                }
                return comp;
              }

              const vId = resolveVariantIdInApp(currentProducts, comp.productId, comp.productName, comp.variantId, comp.size);
              if (vId) {
                const currentStock = remainingPhysicalStock.get(vId) || 0;
                if (currentStock >= comp.quantity) {
                  remainingPhysicalStock.set(vId, currentStock - comp.quantity);
                  reservedByVariant.set(vId, (reservedByVariant.get(vId) || 0) + comp.quantity);
                  if (comp.status !== 'reservado') {
                    saleItemChanged = true;
                    return { ...comp, status: 'reservado' as const };
                  }
                } else {
                  if (comp.status === 'reservado' || comp.status === 'aguardando_pagamento') {
                    saleItemChanged = true;
                    return { ...comp, status: 'pedido_a_fazer' as const };
                  }
                }
              }
              return comp;
            });

            const allReserved = updatedComponents.every((c) => c.status === 'reservado' || c.status === 'disponivel_entrega' || c.status === 'entregue');
            const anyReserved = updatedComponents.some((c) => c.status === 'reservado' || c.status === 'disponivel_entrega');
            const kitStatus = allReserved ? 'reservado' : anyReserved ? 'reservado' : 'pedido_a_fazer';

            return { ...item, components: updatedComponents, status: kitStatus as any };
          } else {
            const catalogKit =
              currentKits.find((k) => k.id === item.kitId) ||
              currentKits.find((k) => k.name.trim().toLowerCase() === item.productName.trim().toLowerCase());

            if (catalogKit) {
              catalogKit.items.forEach((ki) => {
                const vId = resolveVariantIdInApp(currentProducts, ki.productId, ki.productName);
                if (vId) {
                  const needed = ki.quantity * item.quantity;
                  const currentStock = remainingPhysicalStock.get(vId) || 0;
                  if (currentStock >= needed) {
                    remainingPhysicalStock.set(vId, currentStock - needed);
                    reservedByVariant.set(vId, (reservedByVariant.get(vId) || 0) + needed);
                  }
                }
              });
            }
          }
        }

        return item;
      });

      if (saleItemChanged) {
        salesChanged = true;
        const hasMissingStock = updatedItems.some(
          (i) => i.status === 'pedido_a_fazer' || (i.isKit && i.components?.some((c) => c.status === 'pedido_a_fazer'))
        );
        const overallStatus = hasMissingStock ? 'aguardando_pedido' : 'parcialmente_disponivel';
        const updatedSale = { ...sale, items: updatedItems, overallStatus: overallStatus as any };
        void saveSaleToSupabase(updatedSale);
        return updatedSale;
      }

      return sale;
    });

    if (salesChanged) {
      setSales(updatedSales);
    }

    let anyChanged = false;
    const nextProducts = currentProducts.map((p) => {
      let pChanged = false;
      const nextVariants = p.variants.map((v) => {
        const expectedReserved = reservedByVariant.get(v.id) || 0;
        if (v.reservedStock !== expectedReserved) {
          pChanged = true;
          anyChanged = true;
          return { ...v, reservedStock: expectedReserved };
        }
        return v;
      });

      if (!pChanged) return p;
      const updatedP = { ...p, variants: nextVariants };
      void saveProductToSupabase(updatedP);
      return updatedP;
    });

    if (anyChanged) {
      setProducts(nextProducts);
    }
  };

  // Load initial data from Supabase if configured
  useEffect(() => {
    async function loadSupabaseData() {
      const [dbSettings, dbCategories, dbMembers, dbProducts, dbKits, dbSales, dbBatches, dbAuditLogs] =
        await Promise.all([
          fetchAppSettingsFromSupabase(),
          fetchCategoriesFromSupabase(),
          fetchMembersFromSupabase(),
          fetchProductsFromSupabase(),
          fetchKitsFromSupabase(),
          fetchSalesFromSupabase(),
          fetchPurchaseBatchesFromSupabase(),
          getAuditLogs()
        ]);
      const dbUsers = await fetchProfilesFromSupabase();

      if (dbSettings) {
        const normalizedSettings = normalizeSettingsLogos(dbSettings);
        setSettings(normalizedSettings);
        if (
          normalizedSettings.clubLogoUrl !== dbSettings.clubLogoUrl ||
          normalizedSettings.desbravadoresLogoUrl !== dbSettings.desbravadoresLogoUrl
        ) {
          void saveAppSettingsToSupabase(normalizedSettings);
        }
      } else {
        void saveAppSettingsToSupabase(INITIAL_SETTINGS);
      }

      if (dbCategories && dbCategories.length > 0) {
        setCategories(dbCategories);
      } else {
        void saveCategoriesToSupabase(INITIAL_CATEGORIES);
      }

      if (dbMembers) setMembers(dbMembers);
      if (dbProducts) setProducts(dbProducts);
      if (dbKits) setKits(dbKits);
      if (dbSales) setSales(dbSales);
      if (dbBatches) setBatches(dbBatches);
      setAuditLogs(dbAuditLogs);

      if (dbProducts && dbSales) {
        // Resolve legacy sales items stuck in aguardando_pagamento for paid sales
        const tempAvailable = new Map<string, number>();
        dbProducts.forEach((p) => {
          p.variants.forEach((v) => {
            tempAvailable.set(v.id, Math.max(0, v.physicalStock - v.reservedStock));
          });
        });

        const fixedSales = dbSales.map((sale) => {
          if (sale.overallStatus === 'cancelada' || sale.paidAmount <= 0) {
            return sale;
          }

          let itemsChanged = false;
          const updatedItems = sale.items.map((item) => {
            if (item.status !== 'aguardando_pagamento') return item;

            if (item.isKit && item.components && item.components.length > 0) {
              const updatedComponents = item.components.map((comp) => {
                if (comp.status !== 'aguardando_pagamento') return comp;
                const vId = resolveVariantIdInApp(dbProducts, comp.productId, comp.productName, comp.variantId, comp.size);
                if (vId) {
                  const avail = tempAvailable.get(vId) || 0;
                  if (avail >= comp.quantity) {
                    tempAvailable.set(vId, avail - comp.quantity);
                    itemsChanged = true;
                    return { ...comp, status: 'reservado' as const };
                  } else {
                    itemsChanged = true;
                    return { ...comp, status: 'pedido_a_fazer' as const };
                  }
                }
                return comp;
              });

              const allReserved = updatedComponents.every((c) => c.status === 'reservado');
              const anyReserved = updatedComponents.some((c) => c.status === 'reservado');
              const kitStatus = allReserved ? 'reservado' : anyReserved ? 'reservado' : 'pedido_a_fazer';

              return {
                ...item,
                components: updatedComponents,
                status: kitStatus as any
              };
            }

            const vId = resolveVariantIdInApp(dbProducts, item.productId, item.productName, item.variantId, item.size);
            if (vId) {
              const avail = tempAvailable.get(vId) || 0;
              if (avail >= item.quantity) {
                tempAvailable.set(vId, avail - item.quantity);
                itemsChanged = true;
                return { ...item, status: 'reservado' as const };
              } else {
                itemsChanged = true;
                return { ...item, status: 'pedido_a_fazer' as const };
              }
            }

            return item;
          });

          if (!itemsChanged) return sale;
          const updatedSale = { ...sale, items: updatedItems };
          void saveSaleToSupabase(updatedSale);
          return updatedSale;
        });

        setSales(fixedSales);
        syncAllReservedStock(fixedSales, dbProducts);
      }

      if (dbUsers && dbUsers.length > 0) {
        setUsers(dbUsers);
      } else {
        setUsers([]);
      }

      setDataReady(true);
    }
    loadSupabaseData();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111111] border border-[#2e2e2e] rounded-2xl p-6 text-center space-y-3">
          <div className="text-[#F97316] font-black uppercase tracking-[0.2em] text-xs">UniVendas</div>
          <h1 className="text-xl font-bold text-white">Validando sessão no Supabase</h1>
          <p className="text-sm text-gray-400">
            Carregando a autenticação e o perfil administrativo antes de liberar o sistema.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginView settings={settings} />;
  }

  // --- Handlers ---
  const handleAddMember = (m: Member) => {
    setMembers((prev) => [m, ...prev]);
    void saveSingleMemberToSupabase(m);
  };

  const handleUpdateMember = (m: Member) => {
    setMembers((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    void saveSingleMemberToSupabase(m);
  };

  const handleDeleteMember = (id: string) => {
    setMembers((prev) => prev.filter((x) => x.id !== id));
    void deleteMemberFromSupabase(id);
  };

  const handleImportMembers = async (newMembers: Member[]) => {
    setMembers((prev) => [...newMembers, ...prev]);
    const ok = await saveMembersToSupabase(newMembers);
    if (!ok) {
      return false;
    }
    return true;
  };

  const handleResolveDuplicate = (
    caseId: string,
    action: 'keep_both' | 'ignore_new' | 'update_existing' | 'merged',
    updatedMember?: Member
  ) => {
    setDuplicateCases((prev) => prev.filter((c) => c.id !== caseId));
    if (updatedMember) {
      handleUpdateMember(updatedMember);
    }
  };

  const handleAddProduct = async (p: Product, sizeNames: string[] = []) => {
    setProducts((prev) => [p, ...prev]);
    const savedProduct = await saveProductToSupabase(p);

    if (!savedProduct) return p;

    if (sizeNames.length > 0) {
      await saveProductSizesToSupabase(savedProduct.id, sizeNames);
    }

    const savedVariantsBySize = new Map(savedProduct.variants.map((variant) => [variant.size, variant]));
    const syncedProduct = await saveProductToSupabase({
      ...savedProduct,
      variants: p.variants.map((variant) => ({
        ...variant,
        id: savedVariantsBySize.get(variant.size)?.id || variant.id
      }))
    });
    const finalProduct = syncedProduct || { ...savedProduct, variants: p.variants };

    setProducts((prev) => prev.map((item) => (item.id === p.id || item.id === finalProduct.id ? finalProduct : item)));
    return finalProduct;
  };

  const handleUpdateProduct = async (p: Product, sizeNames?: string[]) => {
    setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    if (sizeNames) {
      await saveProductSizesToSupabase(p.id, sizeNames);
    }
    const savedProduct = await saveProductToSupabase(p);
    if (savedProduct) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? savedProduct : x)));
      return savedProduct;
    }
    return p;
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    void deleteProductFromSupabase(productId);
  };

  const handleAddKit = (k: Kit) => {
    setKits([k, ...kits]);
    void saveKitToSupabase(k);
  };



  const getSaleReservedStockMap = (sale: Sale) => {
    const reservedByVariant = new Map<string, number>();
    if (sale.overallStatus === 'cancelada') return reservedByVariant;

    sale.items.forEach((item) => {
      if (item.status === 'entregue') return;

      if (!item.isKit) {
        if (isItemReservedStatus(sale, item.status)) {
          const vId = resolveVariantIdInApp(products, item.productId, item.productName, item.variantId, item.size);
          if (vId) {
            reservedByVariant.set(vId, (reservedByVariant.get(vId) || 0) + item.quantity);
          }
        }
      } else {
        if (item.components && item.components.length > 0) {
          item.components.forEach((comp) => {
            if (comp.status === 'entregue') return;
            if (isItemReservedStatus(sale, comp.status || item.status)) {
              const vId = resolveVariantIdInApp(products, comp.productId, comp.productName, comp.variantId, comp.size);
              if (vId) {
                reservedByVariant.set(vId, (reservedByVariant.get(vId) || 0) + comp.quantity);
              }
            }
          });
        } else {
          const catalogKit =
            kits.find((k) => k.id === item.kitId) ||
            kits.find((k) => k.name.trim().toLowerCase() === item.productName.trim().toLowerCase());

          if (catalogKit && isItemReservedStatus(sale, item.status)) {
            catalogKit.items.forEach((ki) => {
              const vId = resolveVariantIdInApp(products, ki.productId, ki.productName);
              if (vId) {
                reservedByVariant.set(vId, (reservedByVariant.get(vId) || 0) + (ki.quantity * item.quantity));
              }
            });
          }
        }
      }
    });

    return reservedByVariant;
  };

  const applySaleReservationDelta = (previousSale: Sale | null, nextSale: Sale) => {
    const previousReserved = previousSale ? getSaleReservedStockMap(previousSale) : new Map<string, number>();
    const nextReserved = getSaleReservedStockMap(nextSale);
    const variantIds = new Set([...previousReserved.keys(), ...nextReserved.keys()]);

    if (variantIds.size === 0) return;

    setProducts((prev) =>
      prev.map((p) => {
        let changed = false;

        const updatedProd = {
          ...p,
          variants: p.variants.map((v) => {
            if (!variantIds.has(v.id)) return v;

            const delta = (nextReserved.get(v.id) || 0) - (previousReserved.get(v.id) || 0);
            if (delta === 0) return v;

            changed = true;
            return { ...v, reservedStock: Math.max(0, v.reservedStock + delta) };
          })
        };

        if (!changed) return p;
        void saveProductToSupabase(updatedProd);
        return updatedProd;
      })
    );
  };

  const saleHasDelivery = (sale: Sale) =>
    sale.overallStatus === 'entregue' ||
    sale.items.some((item) => item.status === 'entregue' || Boolean(item.deliveryId));

  const handleCompleteSale = (newSale: Sale) => {
    setSales((prev) => [newSale, ...prev]);
    void saveSaleToSupabase(newSale);
    applySaleReservationDelta(null, newSale);
  };

  const reserveSaleStock = (sale: Sale) => {
    applySaleReservationDelta(null, sale);
  };

  const handleUpdateSale = (updatedSale: Sale) => {
    const previousSale = sales.find((sale) => sale.id === updatedSale.id);
    if (!previousSale || saleHasDelivery(previousSale)) return;

    const nextSale = { ...updatedSale, updatedAt: new Date().toISOString() };
    setSales((prev) => prev.map((sale) => (sale.id === nextSale.id ? nextSale : sale)));
    void saveSaleToSupabase(nextSale);
    applySaleReservationDelta(previousSale, nextSale);

    const updatedItemsById = new Map(nextSale.items.map((item) => [item.id, item]));
    const removedItemIds = new Set(previousSale.items.map((item) => item.id));
    nextSale.items.forEach((item) => removedItemIds.delete(item.id));

    setBatches((prev) =>
      prev.map((batch) => {
        let changed = false;
        const items = batch.items
          .filter((batchItem) => {
            const keepItem = !removedItemIds.has(batchItem.saleItemId);
            if (!keepItem) changed = true;
            return keepItem;
          })
          .map((batchItem) => {
            const updatedItem = updatedItemsById.get(batchItem.saleItemId);
            if (!updatedItem) return batchItem;

            const itemChanged =
              batchItem.productId !== (updatedItem.productId || '') ||
              batchItem.productName !== updatedItem.productName ||
              batchItem.variantId !== (updatedItem.variantId || '') ||
              batchItem.size !== updatedItem.size ||
              batchItem.quantityRequested !== updatedItem.quantity;

            if (!itemChanged) return batchItem;
            changed = true;

            return {
              ...batchItem,
              productId: updatedItem.productId || '',
              productName: updatedItem.productName,
              variantId: updatedItem.variantId || '',
              size: updatedItem.size,
              quantityRequested: updatedItem.quantity,
              quantityMissing: Math.max(0, updatedItem.quantity - batchItem.quantityReceived),
              status: updatedItem.status
            };
          });

        if (!changed) return batch;

        const updatedBatch = {
          ...batch,
          items,
          totalItems: items.reduce((total, item) => total + item.quantityRequested, 0),
          estimatedCost: items.reduce((total, item) => total + item.quantityRequested * item.unitCost, 0),
          updatedAt: new Date().toISOString()
        };
        void savePurchaseBatchToSupabase(updatedBatch);
        return updatedBatch;
      })
    );

    logAuditEvent(
      'usr-current',
      user.name,
      'EDITAR_VENDA',
      'sales',
      `Venda ${nextSale.code} editada antes da entrega`
    );
  };

  const handleAddPayment = (saleId: string, payment: Payment) => {
    const now = new Date().toISOString();
    let paidSale: Sale | null = null;
    let prevSale: Sale | null = null;

    setSales((prev) =>
      prev.map((s) => {
        if (s.id !== saleId) return s;
        prevSale = s;

        const paidAmount = Math.min(s.totalAmount, s.paidAmount + payment.amount);
        const pendingAmount = Math.max(0, s.totalAmount - paidAmount);
        const paymentStatus = pendingAmount <= 0 ? 'pago' : 'parcialmente_pago';

        // Update item statuses when fully paid: aguardando_pagamento -> reservado or pedido_a_fazer
        let updatedItems = s.items;
        if (paymentStatus === 'pago') {
          const tempAvailable = new Map<string, number>();
          products.forEach((p) => {
            p.variants.forEach((v) => {
              tempAvailable.set(v.id, Math.max(0, v.physicalStock - v.reservedStock));
            });
          });

          updatedItems = s.items.map((item) => {
            if (item.status !== 'aguardando_pagamento') return item;

            if (item.isKit && item.components) {
              const updatedComponents = item.components.map((comp) => {
                if (comp.status !== 'aguardando_pagamento' || !comp.variantId) return comp;
                const avail = tempAvailable.get(comp.variantId) || 0;
                if (avail >= comp.quantity) {
                  tempAvailable.set(comp.variantId, avail - comp.quantity);
                  return { ...comp, status: 'reservado' as const };
                } else {
                  return { ...comp, status: 'pedido_a_fazer' as const };
                }
              });
              const allReserved = updatedComponents.every((c) => c.status === 'reservado');
              return {
                ...item,
                components: updatedComponents,
                status: allReserved ? ('reservado' as const) : ('pedido_a_fazer' as const)
              };
            }

            if (item.variantId) {
              const avail = tempAvailable.get(item.variantId) || 0;
              if (avail >= item.quantity) {
                tempAvailable.set(item.variantId, avail - item.quantity);
                return { ...item, status: 'reservado' as const };
              } else {
                return { ...item, status: 'pedido_a_fazer' as const };
              }
            }

            return item;
          });
        }

        const hasMissingStock = updatedItems.some(
          (i) => i.status === 'pedido_a_fazer' ||
            (i.isKit && i.components?.some((c) => c.status === 'pedido_a_fazer'))
        );
        const overallStatus =
          paymentStatus === 'pago'
            ? hasMissingStock
              ? 'aguardando_pedido'
              : 'parcialmente_disponivel'
            : s.overallStatus;

        const updatedSale: Sale = {
          ...s,
          paidAmount,
          pendingAmount,
          paymentStatus,
          overallStatus,
          items: updatedItems,
          payments: [...s.payments, { ...payment, saleId, status: paymentStatus }],
          updatedAt: now
        };

        paidSale = updatedSale;
        void saveSaleToSupabase(updatedSale);
        return updatedSale;
      })
    );

    if (paidSale?.paymentStatus === 'pago') {
      applySaleReservationDelta(prevSale, paidSale);
    }
  };

  const handleCancelSale = (saleId: string, reason: string) => {
    setSales(
      sales.map((s) => {
        if (s.id === saleId) {
          const updatedSale = {
            ...s,
            overallStatus: 'cancelada',
            cancellationReason: reason,
            cancelledAt: new Date().toISOString()
          };
          void saveSaleToSupabase(updatedSale);
          return updatedSale;
        }
        return s;
      })
    );
  };

  const handleCreateBatchFromPending = (selected: { sale: Sale; item: any }[]) => {
    const totalItemsCount = selected.reduce((a, s) => a + s.item.quantity, 0);
    const estimatedCost = totalItemsCount * 28.0;
    const batchId = crypto.randomUUID();

    const newBatchItems: PurchaseBatchItem[] = selected.map(({ sale, item }) => ({
      id: crypto.randomUUID(),
      batchId,
      saleItemId: item.id,
      saleCode: sale.code,
      memberId: sale.memberId,
      memberName: sale.memberName,
      memberUnit: sale.memberUnit,
      productId: item.productId || '',
      productName: item.productName,
      variantId: item.variantId || '',
      size: item.size,
      quantityRequested: item.quantity,
      quantityReceived: 0,
      quantityMissing: item.quantity,
      quantitySurplus: 0,
      quantityDamaged: 0,
      unitCost: 28.0,
      status: 'pedido_enviado'
    }));

    const batchCode = `LOTE-${new Date().getFullYear().toString().slice(-2)}${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}-${String(batches.length + 1).padStart(3, '0')}`;

    const newBatch: PurchaseBatch = {
      id: batchId,
      code: batchCode,
      supplierName: 'Uniformização Desbravadores Brasil',
      status: 'enviado_fornecedor',
      totalItems: totalItemsCount,
      estimatedCost,
      sentAt: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      items: newBatchItems,
      createdAt: new Date().toISOString(),
      createdBy: user.name,
      updatedAt: new Date().toISOString()
    };

    setBatches([newBatch, ...batches]);
    void savePurchaseBatchToSupabase(newBatch);

    const selectedItemIds = new Set(selected.map(({ item }) => item.id));
    const updatedSales = sales.map((sale) => {
      const updatedItems = sale.items.map((item) => {
        if (!selectedItemIds.has(item.id)) return item;
        return {
          ...item,
          status: 'incluido_em_lote' as const,
          batchId,
          batchCode
        };
      });

      const hasChanges = updatedItems.some((item, index) => item !== sale.items[index]);
      if (!hasChanges) return sale;

      const updatedSale = {
        ...sale,
        items: updatedItems,
        overallStatus: 'aguardando_fornecedor' as const,
        updatedAt: new Date().toISOString()
      };
      void saveSaleToSupabase(updatedSale);
      return updatedSale;
    });

    setSales(updatedSales);
    setActiveTab('batches');
  };

  const handleSaveConference = (updatedBatch: PurchaseBatch) => {
    setBatches(batches.map((b) => (b.id === updatedBatch.id ? updatedBatch : b)));
    void savePurchaseBatchToSupabase(updatedBatch);

    if (updatedBatch.status === 'recebido' || updatedBatch.status === 'em_conferencia') {
      const receivedVariantMap = new Map<string, number>();
      updatedBatch.items.forEach((bItem) => {
        if (bItem.variantId && bItem.quantityReceived > 0) {
          receivedVariantMap.set(
            bItem.variantId,
            (receivedVariantMap.get(bItem.variantId) || 0) + bItem.quantityReceived
          );
        }
      });

      if (receivedVariantMap.size > 0) {
        setProducts((prev) =>
          prev.map((p) => {
            let changed = false;
            const updatedProd = {
              ...p,
              variants: p.variants.map((v) => {
                const received = receivedVariantMap.get(v.id);
                if (!received) return v;
                changed = true;
                return { ...v, physicalStock: v.physicalStock + received };
              })
            };
            if (!changed) return p;
            void saveProductToSupabase(updatedProd);
            return updatedProd;
          })
        );
      }

      const batchSaleItemIds = new Set(updatedBatch.items.map((bi) => bi.saleItemId));
      if (batchSaleItemIds.size > 0) {
        setSales((prev) =>
          prev.map((sale) => {
            let changed = false;
            const updatedItems = sale.items.map((item) => {
              if (!batchSaleItemIds.has(item.id)) return item;
              if (
                item.status === 'recebido' ||
                item.status === 'em_conferencia' ||
                item.status === 'conferido_com_divergencia' ||
                item.status === 'aguardando_fornecedor' ||
                item.status === 'recebido_parcialmente'
              ) {
                changed = true;
                return { ...item, status: 'disponivel_entrega' as any };
              }
              return item;
            });
            if (!changed) return sale;
            const hasMissingStock = updatedItems.some((i) => i.status === 'pedido_a_fazer');
            const allReady = updatedItems.every(
              (i) => i.status === 'disponivel_entrega' || i.status === 'entregue'
            );
            const updatedSale = {
              ...sale,
              items: updatedItems,
              overallStatus: allReady ? 'disponivel_entrega' : hasMissingStock ? 'parcialmente_disponivel' : sale.overallStatus
            };
            void saveSaleToSupabase(updatedSale);
            return updatedSale;
          })
        );
      }
    }
  };

  const handleConfirmDelivery = (record: DeliveryRecord) => {
    const deliveredVariantDeltas = new Map<string, number>();

    // Update items status in sales to delivered
    setSales((prev) =>
      prev.map((s) => {
        if (s.id !== record.saleId) return s;

        const updatedItems = s.items.map((i) => {
          const delivered = record.items.find((ri) => ri.saleItemId === i.id);
          if (!delivered) return i;

          if (!i.isKit && i.variantId) {
            deliveredVariantDeltas.set(
              i.variantId,
              (deliveredVariantDeltas.get(i.variantId) || 0) + i.quantity
            );
          }
          if (i.isKit && i.components) {
            i.components.forEach((comp) => {
              if (comp.variantId) {
                deliveredVariantDeltas.set(
                  comp.variantId,
                  (deliveredVariantDeltas.get(comp.variantId) || 0) + comp.quantity
                );
              }
            });
          }

          const updatedComponents = i.components?.map((c) => ({ ...c, status: 'entregue' as any }));
          return { ...i, status: 'entregue' as any, components: updatedComponents };
        });

        const allDelivered = updatedItems.every((i) => i.status === 'entregue');
        const updatedSale = {
          ...s,
          items: updatedItems,
          overallStatus: allDelivered ? 'entregue' : s.overallStatus
        };
        void saveSaleToSupabase(updatedSale);
        return updatedSale;
      })
    );

    // Decrement physical stock and reserved stock for delivered items
    if (deliveredVariantDeltas.size > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          let changed = false;
          const updatedProd = {
            ...p,
            variants: p.variants.map((v) => {
              const delta = deliveredVariantDeltas.get(v.id);
              if (!delta) return v;
              changed = true;
              return {
                ...v,
                physicalStock: Math.max(0, v.physicalStock - delta),
                reservedStock: Math.max(0, v.reservedStock - delta)
              };
            })
          };
          if (!changed) return p;
          void saveProductToSupabase(updatedProd);
          return updatedProd;
        })
      );
    }
  };

  const handleProcessReturn = (record: ReturnExchangeRecord) => {
    // Stock auto addition if item is new
  };

  const handleAddUser = (u: User) => {
    setUsers([u, ...users]);
    void saveUserToSupabase(u);
  };
  const handleUpdateUser = (u: User) => {
    setUsers(users.map((x) => (x.id === u.id ? u : x)));
    void saveUserToSupabase(u);
  };

  const handleClearAllData = () => {
    if (
      window.confirm(
        'Tem certeza de que deseja zerar todos os membros, produtos, vendas e lotes cadastrados? Esta ação deixará o banco zerado para sua importação.'
      )
    ) {
      setMembers([]);
      setProducts([]);
      setCategories([]);
      setKits([]);
      setSales([]);
      setBatches([]);
      setDuplicateCases([]);
    }
  };

  // Render View according to Active Tab
  const renderView = () => {
    if (conferencingBatch) {
      return (
        <ConferenceView
          batch={conferencingBatch}
          onBack={() => setConferencingBatch(null)}
          onSaveConference={handleSaveConference}
          userName={user.name}
        />
      );
    }

    if (selectedBatch) {
      return (
        <BatchDetailView
          batch={selectedBatch}
          onBack={() => setSelectedBatch(null)}
          onOpenConference={(b) => setConferencingBatch(b)}
          userName={user.name}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            sales={sales}
            members={members}
            products={products}
            batches={batches}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'members':
        return (
          <MembersView
            members={members}
            sales={sales}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onNavigateToImport={() => setActiveTab('member_import')}
            userName={user.name}
          />
        );
      case 'member_import':
        return (
          <MemberImportView
            existingMembers={members}
            onConfirmImport={handleImportMembers}
            userName={user.name}
          />
        );
      case 'member_duplicates':
        return (
          <MemberDuplicatesView
            duplicates={duplicateCases}
            onResolveDuplicate={handleResolveDuplicate}
            userName={user.name}
          />
        );
      case 'products':
        return (
          <ProductsView
            products={products}
            categories={categories}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        );
      case 'kits':
        return <KitsView kits={kits} products={products} onAddKit={handleAddKit} />;
      case 'stock':
        return <StockView products={products} />;
      case 'new_sale':
        return (
          <NewSaleView
            members={members}
            products={products}
            kits={kits}
            onCompleteSale={handleCompleteSale}
            userName={user.name}
          />
        );
      case 'sales_list':
        return (
          <SalesListView
            sales={sales}
            products={products}
            onCancelSale={handleCancelSale}
            onAddPayment={handleAddPayment}
            onUpdateSale={handleUpdateSale}
            userName={user.name}
          />
        );
      case 'pending_orders':
        return (
          <PendingOrdersView sales={sales} onCreateBatch={handleCreateBatchFromPending} />
        );
      case 'purchase_batches':
        return (
          <PurchaseBatchesView
            batches={batches}
            onSelectBatch={(b) => setSelectedBatch(b)}
            userName={user.name}
          />
        );
      case 'deliveries':
        return (
          <DeliveriesView
            sales={sales}
            onConfirmDelivery={handleConfirmDelivery}
            userName={user.name}
          />
        );
      case 'returns':
        return (
          <ReturnsView sales={sales} onProcessReturn={handleProcessReturn} userName={user.name} />
        );
      case 'financial':
        return <FinancialView sales={sales} batches={batches} userName={user.name} />;
      case 'reports':
        return (
          <ReportsView
            members={members}
            products={products}
            sales={sales}
            batches={batches}
            logs={auditLogs}
            userName={user.name}
          />
        );
      case 'users':
        return (
          <UsersView
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            currentUserName={user.name}
          />
        );
      case 'audit':
        return <AuditView logs={auditLogs} userName={user.name} />;
      case 'settings':
        return <SettingsView onClearAllData={handleClearAllData} />;
      default:
        return <DashboardView sales={sales} members={members} products={products} batches={batches} onNavigate={setActiveTab} />;
    }
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard do Clube';
      case 'members': return 'Gerenciamento de Membros';
      case 'member_import': return 'Importação de Membros por Excel';
      case 'member_duplicates': return 'Análise de Membros Duplicados';
      case 'products': return 'Catálogo de Produtos e Tamanhos';
      case 'kits': return 'Kits e Enxovais do Clube';
      case 'stock': return 'Controle de Estoque Físico';
      case 'new_sale': return 'Nova Venda / Pedido do Membro';
      case 'sales_list': return 'Histórico de Vendas do Clube';
      case 'pending_orders': return 'Pedidos Aguardando Lote de Compra';
      case 'purchase_batches': return 'Lotes de Compras para Fornecedor';
      case 'conference': return 'Conferência de Pedidos Recebidos';
      case 'deliveries': return 'Controle de Entregas aos Membros';
      case 'returns': return 'Trocas e Devoluções de Itens';
      case 'financial': return 'Resumo e Fluxo Financeiro';
      case 'reports': return 'Relatórios e Exportação Excel';
      case 'users': return 'Gestão de Usuários e Permissões';
      case 'audit': return 'Trilha de Auditoria do Sistema';
      case 'settings': return 'Configurações e Banco de Dados';
      default: return 'Sistema de Vendas e Estoque';
    }
  };

  const pendingOrdersCount = sales
    .flatMap((s) => s.items)
    .filter((i) => i.status === 'pendente').length;

  const pendingDeliveriesCount = sales
    .flatMap((s) => s.items)
    .filter((i) => i.status === 'comprado_recebido' || i.status === 'em_estoque_reservado').length;

  const openBatchesCount = batches.filter((b) => b.status !== 'concluido' && b.status !== 'cancelado').length;

  if (!dataReady) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111111] border border-[#2e2e2e] rounded-2xl p-6 text-center space-y-3">
          <div className="text-[#F97316] font-black uppercase tracking-[0.2em] text-xs">UniVendas</div>
          <h1 className="text-xl font-bold text-white">Carregando dados reais do Supabase</h1>
          <p className="text-sm text-gray-400">
            Aguarde enquanto o sistema busca membros, produtos, vendas, lotes e configurações no banco.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-100 font-sans flex flex-col">
      <Header
        settings={settings}
        onOpenSettings={() => setActiveTab('settings')}
        activeTabTitle={getTabTitle(activeTab)}
        onOpenMenu={() => setMobileSidebarOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setSelectedBatch(null);
              setConferencingBatch(null);
              setActiveTab(tab);
            }}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            badgeCounts={{
              pendingOrders: pendingOrdersCount,
              duplicates: duplicateCases.length,
              pendingDeliveries: pendingDeliveriesCount,
              openBatches: openBatchesCount
            }}
          />
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute inset-0 bg-black/70"
            />
            <div className="relative h-full w-[82vw] max-w-80 shadow-2xl">
              <Sidebar
                activeTab={activeTab}
                onSelectTab={(tab) => {
                  setSelectedBatch(null);
                  setConferencingBatch(null);
                  setActiveTab(tab);
                  setMobileSidebarOpen(false);
                }}
                badgeCounts={{
                  pendingOrders: pendingOrdersCount,
                  duplicates: duplicateCases.length,
                  pendingDeliveries: pendingDeliveriesCount,
                  openBatches: openBatchesCount
                }}
              />
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full min-w-0">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
