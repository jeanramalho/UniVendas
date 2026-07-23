import React, { useState } from 'react';
import {
  Sale,
  PurchaseBatch,
  Member,
  Product
} from '../types';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Package,
  TrendingUp,
  Filter
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardViewProps {
  sales: Sale[];
  members: Member[];
  products: Product[];
  batches: PurchaseBatch[];
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  members,
  products,
  batches,
  onNavigateTab
}) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Filter sales based on controls
  const filteredSales = sales.filter((s) => {
    if (selectedUnit !== 'all' && s.memberUnit !== selectedUnit) return false;
    return true;
  });

  // KPI Calculations
  const totalSold = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalPaid = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalPending = filteredSales.reduce((acc, s) => acc + s.pendingAmount, 0);

  const pendingSupplierOrderItems = filteredSales
    .flatMap((s) => s.items)
    .filter((i) => i.status === 'pedido_a_fazer').length;

  const availableDeliveryItems = filteredSales
    .flatMap((s) => s.items)
    .filter((i) => i.status === 'disponivel_entrega' || i.status === 'reservado').length;

  const lowStockProducts = products.filter((p) => {
    const totalPhysical = p.variants.reduce((a, v) => a + v.physicalStock, 0);
    return totalPhysical <= p.minStock;
  }).length;

  const activeMembersCount = members.filter((m) => m.active).length;

  // Chart Data Preparation: Sales by Unit
  const unitSalesMap: Record<string, number> = {};
  filteredSales.forEach((s) => {
    unitSalesMap[s.memberUnit] = (unitSalesMap[s.memberUnit] || 0) + s.totalAmount;
  });
  const salesByUnitChart = Object.entries(unitSalesMap).map(([unit, total]) => ({
    name: unit.replace('Unidade ', ''),
    val: total
  }));

  // Chart Data Preparation: Payment Status Breakdown
  const paymentStatusPie = [
    { name: 'Pagas', value: filteredSales.filter((s) => s.paymentStatus === 'pago').length, color: '#10B981' },
    { name: 'Parcial', value: filteredSales.filter((s) => s.paymentStatus === 'parcialmente_pago').length, color: '#F59E0B' },
    { name: 'A Pagar', value: filteredSales.filter((s) => s.paymentStatus === 'a_pagar').length, color: '#EF4444' }
  ];

  // Unique units for dropdown filter
  const unitsList = Array.from(new Set(members.map((m) => m.unit))).sort();

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0d0d] border border-zinc-800 p-5 rounded-xl">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-500 mb-1">
            Módulo de Gestão
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-[#F97316]" />
            <span>Dashboard do Clube</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Visão geral de faturamento, estoque, pedidos a fornecedores e entregas
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-[#080808] px-3.5 py-2 rounded-lg border border-zinc-800">
            <Filter className="w-3.5 h-3.5 text-[#F97316]" />
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Unidade:</span>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Unidades</option>
              {unitsList.map((u) => (
                <option key={u} value={u} className="bg-[#1a1a1a] text-white">
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0d0d0d] border border-zinc-800 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-extrabold">Total Vendido</span>
            <div className="bg-amber-500/10 p-2 rounded text-[#F97316]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tighter">
            R$ {totalSold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{filteredSales.length} vendas registradas</p>
        </div>

        <div className="bg-[#0d0d0d] border border-zinc-800 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-extrabold">Total Recebido</span>
            <div className="bg-emerald-500/10 p-2 rounded text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tighter">
            R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Pendente: R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('pending_orders')}
          className="bg-[#0d0d0d] border border-zinc-800 p-5 rounded-xl space-y-2 cursor-pointer hover:border-[#F97316] transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-extrabold">Itens a Pedir</span>
            <div className="bg-red-500/10 p-2 rounded text-red-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-red-400 tracking-tighter">
            {pendingSupplierOrderItems}
          </div>
          <p className="text-[10px] text-red-400 font-extrabold uppercase tracking-wider">Aguardando lote de compra</p>
        </div>

        <div
          onClick={() => onNavigateTab('deliveries')}
          className="bg-[#0d0d0d] border border-zinc-800 p-5 rounded-xl space-y-2 cursor-pointer hover:border-emerald-500 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-extrabold">Pronto p/ Entrega</span>
            <div className="bg-blue-500/10 p-2 rounded text-blue-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-blue-400 tracking-tighter">
            {availableDeliveryItems}
          </div>
          <p className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wider">Reservado / Disponível</p>
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('members')}
          className="bg-[#0d0d0d] border border-zinc-800 p-3.5 rounded-lg flex items-center space-x-3 cursor-pointer hover:border-zinc-700 transition"
        >
          <div className="p-2 bg-zinc-900 rounded text-[#F97316]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-white tracking-tight">{activeMembersCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Membros Ativos</div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('stock')}
          className="bg-[#0d0d0d] border border-zinc-800 p-3.5 rounded-lg flex items-center space-x-3 cursor-pointer hover:border-zinc-700 transition"
        >
          <div className="p-2 bg-zinc-900 rounded text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-white tracking-tight">{lowStockProducts}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Estoque Baixo</div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('purchase_batches')}
          className="bg-[#0d0d0d] border border-zinc-800 p-3.5 rounded-lg flex items-center space-x-3 cursor-pointer hover:border-zinc-700 transition"
        >
          <div className="p-2 bg-zinc-900 rounded text-blue-400">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-white tracking-tight">{batches.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Lotes de Compras</div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('new_sale')}
          className="bg-[#F97316] p-3.5 rounded-lg flex items-center justify-center space-x-2 text-black font-black uppercase tracking-[0.15em] cursor-pointer hover:bg-orange-400 transition shadow-lg"
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="text-xs">Iniciar Nova Venda</span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chart 1: Sales by Unit */}
        <div className="md:col-span-2 bg-[#0d0d0d] border border-zinc-800 p-5 rounded-xl space-y-4">
          <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-500">Desempenho por Setor</div>
          <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-[#F97316]" />
            <span>Vendas por Unidade / Departamento (R$)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByUnitChart.slice(0, 8)}>
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#080808', borderColor: '#27272a', borderRadius: '4px', fontSize: '12px' }}
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Total']}
                />
                <Bar dataKey="val" fill="#F97316" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Payment Status Pie */}
        <div className="bg-[#0d0d0d] border border-zinc-800 p-5 rounded-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-500 mb-1">Distribuição Financeira</div>
            <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-[#F97316]" />
              <span>Status dos Pagamentos</span>
            </h3>
          </div>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentStatusPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentStatusPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#080808', borderColor: '#27272a', borderRadius: '4px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 text-xs">
            {paymentStatusPie.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-zinc-300">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-extrabold">{item.value} vendas</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
