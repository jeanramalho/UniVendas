import React from 'react';
import {
  LayoutDashboard,
  Users,
  Upload,
  UserCheck,
  ShoppingBag,
  Grid,
  Box,
  Layers,
  Package,
  History,
  ClipboardList,
  ShoppingCart,
  ListOrdered,
  DollarSign,
  Clock,
  Truck,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  Shield,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type TabKey =
  | 'dashboard'
  | 'members'
  | 'member_import'
  | 'member_duplicates'
  | 'products'
  | 'categories'
  | 'kits'
  | 'stock'
  | 'stock_movements'
  | 'inventory'
  | 'new_sale'
  | 'sales_list'
  | 'payments'
  | 'pending_orders'
  | 'purchase_batches'
  | 'conference'
  | 'deliveries'
  | 'returns'
  | 'financial'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeTab: string;
  onSelectTab?: (tab: any) => void;
  setActiveTab?: (tab: any) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userRole?: string;
  badgeCounts?: {
    pendingOrders?: number;
    duplicates?: number;
    pendingDeliveries?: number;
    openBatches?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  setActiveTab,
  collapsed = false,
  onToggleCollapse,
  badgeCounts = { pendingOrders: 0, duplicates: 0, pendingDeliveries: 0, openBatches: 0 }
}) => {
  const handleSelect = (tab: TabKey) => {
    if (onSelectTab) onSelectTab(tab);
    if (setActiveTab) setActiveTab(tab);
  };

  const safeBadges = {
    pendingOrders: badgeCounts?.pendingOrders || 0,
    duplicates: badgeCounts?.duplicates || 0,
    pendingDeliveries: badgeCounts?.pendingDeliveries || 0,
    openBatches: badgeCounts?.openBatches || 0
  };
  const navSections = [
    {
      title: 'PRINCIPAL',
      items: [
        { key: 'dashboard' as TabKey, label: 'Dashboard', icon: LayoutDashboard },
        { key: 'new_sale' as TabKey, label: 'Nova Venda', icon: ShoppingCart, highlight: true }
      ]
    },
    {
      title: 'MEMBROS',
      items: [
        { key: 'members' as TabKey, label: 'Lista de Membros', icon: Users },
        { key: 'member_import' as TabKey, label: 'Importar Excel', icon: Upload },
        {
          key: 'member_duplicates' as TabKey,
          label: 'Revisão Duplicidades',
          icon: UserCheck,
          badge: safeBadges.duplicates > 0 ? safeBadges.duplicates : undefined,
          badgeColor: 'bg-[#F97316]'
        }
      ]
    },
    {
      title: 'CATÁLOGO & ESTOQUE',
      items: [
        { key: 'products' as TabKey, label: 'Produtos & Tamanhos', icon: ShoppingBag },
        { key: 'kits' as TabKey, label: 'Kits do Clube', icon: Box },
        { key: 'categories' as TabKey, label: 'Categorias', icon: Grid },
        { key: 'stock' as TabKey, label: 'Controle de Estoque', icon: Layers },
        { key: 'stock_movements' as TabKey, label: 'Movimentações', icon: History },
        { key: 'inventory' as TabKey, label: 'Inventário Físico', icon: ClipboardList }
      ]
    },
    {
      title: 'VENDAS & PEDIDOS',
      items: [
        { key: 'sales_list' as TabKey, label: 'Histórico de Vendas', icon: ListOrdered },
        { key: 'payments' as TabKey, label: 'Pagamentos', icon: DollarSign },
        {
          key: 'pending_orders' as TabKey,
          label: 'Pedidos a Fazer',
          icon: Clock,
          badge: safeBadges.pendingOrders > 0 ? safeBadges.pendingOrders : undefined,
          badgeColor: 'bg-red-500'
        },
        {
          key: 'purchase_batches' as TabKey,
          label: 'Lotes para Fornecedor',
          icon: Package,
          badge: safeBadges.openBatches > 0 ? safeBadges.openBatches : undefined,
          badgeColor: 'bg-blue-500'
        },
        { key: 'conference' as TabKey, label: 'Conferência Recebidos', icon: CheckCircle2 }
      ]
    },
    {
      title: 'ENTREGAS & DEVOLUÇÕES',
      items: [
        {
          key: 'deliveries' as TabKey,
          label: 'Entregas a Membros',
          icon: Truck,
          badge: safeBadges.pendingDeliveries > 0 ? safeBadges.pendingDeliveries : undefined,
          badgeColor: 'bg-emerald-500'
        },
        { key: 'returns' as TabKey, label: 'Trocas & Devoluções', icon: RefreshCw }
      ]
    },
    {
      title: 'FINANCEIRO & AUDITORIA',
      items: [
        { key: 'financial' as TabKey, label: 'Financeiro', icon: TrendingUp },
        { key: 'reports' as TabKey, label: 'Relatórios & Exportação', icon: FileSpreadsheet },
        { key: 'users' as TabKey, label: 'Usuários & Permissões', icon: Shield },
        { key: 'audit' as TabKey, label: 'Auditoria de Ações', icon: FileText },
        { key: 'settings' as TabKey, label: 'Configurações', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`bg-[#0a0a0a] border-r border-zinc-800 text-zinc-300 flex flex-col transition-all duration-300 relative ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-4 bg-[#F97316] text-black rounded-full p-1 shadow-lg hover:bg-orange-400 z-40 hidden md:block"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}

      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6 custom-scrollbar">
        {navSections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!collapsed && (
              <h2 className="text-[10px] font-black text-zinc-500 px-3 uppercase tracking-[0.2em]">
                {sec.title}
              </h2>
            )}

            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => handleSelect(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition tracking-tight ${
                    isActive
                      ? 'bg-[#F97316] text-black font-black uppercase tracking-wider shadow-lg'
                      : item.highlight
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-bold'
                      : 'hover:bg-zinc-900 text-zinc-300 font-medium'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${
                        item.badgeColor || 'bg-[#F97316]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
};
