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
        setSettings(dbSettings);
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

  const handleAddProduct = (p: Product) => {
    setProducts((prev) => [p, ...prev]);
    void saveProductToSupabase(p);
  };

  const handleUpdateProduct = (p: Product) => {
    setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    void saveProductToSupabase(p);
  };

  const handleAddKit = (k: Kit) => {
    setKits([k, ...kits]);
    void saveKitToSupabase(k);
  };

  const handleCompleteSale = (newSale: Sale) => {
    setSales((prev) => [newSale, ...prev]);
    void saveSaleToSupabase(newSale);

    // Reserve or update product stocks
    setProducts((prev) =>
      prev.map((p) => {
        const itemInSale = newSale.items.find((i) => i.productId === p.id);
        if (!itemInSale) return p;

        const updatedProd = {
          ...p,
          variants: p.variants.map((v) => {
            if (v.id === itemInSale.variantId && itemInSale.status === 'reservado') {
              return { ...v, reservedStock: v.reservedStock + itemInSale.quantity };
            }
            return v;
          })
        };
        void saveProductToSupabase(updatedProd);
        return updatedProd;
      })
    );
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

    const newBatchItems: PurchaseBatchItem[] = selected.map(({ sale, item }) => ({
      id: `pbi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      batchId: '',
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
      id: `batch-${Date.now()}`,
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
    setActiveTab('batches');
  };

  const handleSaveConference = (updatedBatch: PurchaseBatch) => {
    setBatches(batches.map((b) => (b.id === updatedBatch.id ? updatedBatch : b)));
    void savePurchaseBatchToSupabase(updatedBatch);
  };

  const handleConfirmDelivery = (record: DeliveryRecord) => {
    // Update items status in sales to delivered
    setSales((prev) =>
      prev.map((s) => {
        if (s.id === record.saleId) {
          const updatedItems = s.items.map((i) => {
            const delivered = record.items.find((ri) => ri.saleItemId === i.id);
            if (delivered) {
              return { ...i, status: 'entregue' as any };
            }
            return i;
          });

          const allDelivered = updatedItems.every((i) => i.status === 'entregue');
          const updatedSale = {
            ...s,
            items: updatedItems,
            overallStatus: allDelivered ? 'entregue' : s.overallStatus
          };
          void saveSaleToSupabase(updatedSale);
          return updatedSale;
        }
        return s;
      })
    );
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
            referenceSizes={INITIAL_SETTINGS.referenceSizes}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
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
            onCancelSale={handleCancelSale}
            onAddPayment={() => {}}
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
      />

      <div className="flex-1 flex overflow-hidden">
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

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
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
