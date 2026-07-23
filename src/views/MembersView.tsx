import React, { useState } from 'react';
import { Member, Sale } from '../types';
import { Search, Filter, Plus, Edit2, FileSpreadsheet, Eye, UserCheck, ShieldAlert, X } from 'lucide-react';
import { exportMembersToExcel } from '../lib/excelExport';

interface MembersViewProps {
  members: Member[];
  sales: Sale[];
  onAddMember: (newM: Member) => void;
  onUpdateMember: (updated: Member) => void;
  onNavigateToImport?: () => void;
  userName: string;
}

const DEFAULT_UNITS = [
  'Unidade Albatroz', 'Unidade Águia', 'Unidade Condor', 'Unidade Falcão',
  'Unidade Fênix', 'Unidade Leão', 'Unidade Tigre', 'Diretoria', 'Geral'
];

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  sales,
  onAddMember,
  onUpdateMember,
  onNavigateToImport,
  userName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State for create / edit
  const [formData, setFormData] = useState<Partial<Member>>({
    name: '',
    unit: 'Unidade Albatroz',
    cellphone: '',
    birthDate: '2012-05-10',
    address: '',
    age: 14,
    motherName: '',
    fatherName: '',
    referenceSize: 'Adulto M',
    responsibleName: '',
    gender: 'M',
    motherPhone: '',
    fatherPhone: '',
    memberPhone: '',
    responsiblePhone: '',
    active: true
  });

  // Filter members
  const filtered = members.filter((m) => {
    if (selectedUnit !== 'all' && m.unit !== selectedUnit) return false;
    if (selectedSize !== 'all' && m.referenceSize !== selectedSize) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = m.name.toLowerCase().includes(term);
      const matchCode = m.internalCode.toLowerCase().includes(term);
      const matchResp = (m.responsibleName || '').toLowerCase().includes(term);
      const matchPhone = (m.cellphone || '').includes(term);
      if (!matchName && !matchCode && !matchResp && !matchPhone) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const existingUnits = Array.from(new Set(members.map((m) => m.unit))).filter(Boolean).sort();
  const unitsList = existingUnits.length > 0 ? existingUnits : DEFAULT_UNITS;
  const sizesList = Array.from(new Set(members.map((m) => m.referenceSize))).filter(Boolean).sort();

  const handleExport = () => {
    exportMembersToExcel(filtered, {
      title: 'Listagem de Membros do Clube',
      userName,
      filtersApplied: `Unidade: ${selectedUnit}, Tamanho: ${selectedSize}, Busca: ${searchTerm || 'Nenhuma'}`
    });
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (isCreating) {
      const newM: Member = {
        ...(formData as Member),
        id: `mbr-${Date.now()}`,
        internalCode: `M-${String(members.length + 1).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onAddMember(newM);
      setIsCreating(false);
    } else if (editingMember) {
      const updated: Member = {
        ...editingMember,
        ...formData,
        updatedAt: new Date().toISOString()
      };
      onUpdateMember(updated);
      setEditingMember(null);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      unit: unitsList[0] || 'Unidade Albatroz',
      cellphone: '',
      birthDate: '2012-05-10',
      address: '',
      age: 14,
      motherName: '',
      fatherName: '',
      referenceSize: 'Adulto M',
      responsibleName: '',
      gender: 'M',
      motherPhone: '',
      fatherPhone: '',
      memberPhone: '',
      responsiblePhone: '',
      active: true
    });
    setIsCreating(true);
  };

  const openEditModal = (m: Member) => {
    setEditingMember(m);
    setFormData(m);
  };

  // Member Sales History for View Modal
  const memberSales = viewingMember ? sales.filter((s) => s.memberId === viewingMember.id) : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-[#F97316]" />
            <span>Cadastro de Membros Desbravadores</span>
          </h2>
          <p className="text-xs text-gray-400">
            Gerencie os {members.length} membros cadastrados para vendas e entregas
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onNavigateToImport && (
            <button
              onClick={onNavigateToImport}
              className="flex items-center space-x-1.5 bg-[#F97316]/10 hover:bg-[#F97316]/20 text-[#F97316] font-bold text-xs px-3 py-2 rounded-lg border border-[#F97316]/30 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar Planilha Excel</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 bg-[#222222] hover:bg-[#333333] text-gray-200 text-xs px-3 py-2 rounded-lg border border-gray-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center space-x-1.5 bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Membro</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#111111] border border-[#222222] p-3 rounded-xl">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por nome, código, responsável ou celular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333333] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#F97316]"
          />
        </div>

        <div className="flex items-center space-x-2 bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#333333]">
          <Filter className="w-3.5 h-3.5 text-[#F97316]" />
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="bg-transparent text-xs text-white w-full focus:outline-none"
          >
            <option value="all">Todas as Unidades</option>
            {unitsList.map((u) => (
              <option key={u} value={u} className="bg-[#1a1a1a]">
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#333333]">
          <span className="text-xs text-gray-400">Tamanho:</span>
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="bg-transparent text-xs text-white w-full focus:outline-none"
          >
            <option value="all">Todos os Tamanhos</option>
            {sizesList.map((s) => (
              <option key={s} value={s} className="bg-[#1a1a1a]">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] text-gray-300 font-semibold border-b border-[#2e2e2e]">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Nome do Membro</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Idade</th>
                <th className="p-3">Tamanho Ref.</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Contato</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a] text-gray-300">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Nenhum membro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginated.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-mono text-[#F97316] font-bold">{m.internalCode}</td>
                    <td className="p-3 font-semibold text-white">{m.name}</td>
                    <td className="p-3">{m.unit}</td>
                    <td className="p-3">{m.age} anos</td>
                    <td className="p-3">
                      <span className="bg-gray-800 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 text-[11px]">
                        {m.referenceSize}
                      </span>
                    </td>
                    <td className="p-3">{m.responsibleName}</td>
                    <td className="p-3 text-gray-400 font-mono text-[11px]">{m.cellphone}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setViewingMember(m)}
                        className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-white rounded"
                        title="Ver Ficha Detalhada"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-1.5 hover:bg-gray-800 text-gray-300 hover:text-[#F97316] rounded"
                        title="Editar Membro"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="bg-[#111111] p-3 border-t border-[#2e2e2e] flex items-center justify-between text-xs text-gray-400">
          <span>
            Mostrando {filtered.length > 0 ? (page - 1) * pageSize + 1 : 0} a{' '}
            {Math.min(page * pageSize, filtered.length)} de {filtered.length} membros
          </span>
          <div className="flex items-center space-x-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 bg-[#1a1a1a] border border-[#333333] rounded hover:bg-gray-800 disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="px-2 font-bold text-white">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 bg-[#1a1a1a] border border-[#333333] rounded hover:bg-gray-800 disabled:opacity-30"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Viewing Member Detail Card & History */}
      {viewingMember && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-2xl w-full p-6 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingMember(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-[#2e2e2e] pb-4">
              <div className="p-3 bg-[#F97316]/20 text-[#F97316] rounded-xl font-mono font-bold text-lg">
                {viewingMember.internalCode}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{viewingMember.name}</h3>
                <p className="text-xs text-gray-400">
                  {viewingMember.unit} • {viewingMember.age} Anos ({viewingMember.gender === 'F' ? 'Feminino' : 'Masculino'})
                </p>
              </div>
            </div>

            {/* Resumo Card */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-[#111111] p-4 rounded-xl border border-[#222222]">
              <div>
                <span className="text-gray-500 block">Tamanho de Ref.</span>
                <span className="font-bold text-amber-400">{viewingMember.referenceSize}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Data de Nascimento</span>
                <span className="font-semibold text-white">{viewingMember.birthDate}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Celular Principal</span>
                <span className="font-mono text-white">{viewingMember.cellphone}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Responsável</span>
                <span className="font-semibold text-white">{viewingMember.responsibleName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Tel. Responsável</span>
                <span className="font-mono text-white">{viewingMember.responsiblePhone}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Mãe / Pai</span>
                <span className="text-gray-300">{viewingMember.motherName || viewingMember.fatherName || '-'}</span>
              </div>
            </div>

            {/* Member Sales History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#F97316] uppercase tracking-wider">
                Histórico de Compras ({memberSales.length})
              </h4>
              {memberSales.length === 0 ? (
                <div className="bg-[#111111] p-4 rounded-lg text-xs text-gray-500 text-center">
                  Este membro ainda não realizou compras registradas.
                </div>
              ) : (
                <div className="space-y-2">
                  {memberSales.map((s) => (
                    <div
                      key={s.id}
                      className="bg-[#111111] border border-[#222222] p-3 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white font-mono">{s.code}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(s.createdAt).toLocaleDateString('pt-BR')} • {s.items.length} itens
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#F97316]">
                          R$ {s.totalAmount.toFixed(2)}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {s.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Member Form */}
      {(isCreating || editingMember) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveMember}
            className="bg-[#1a1a1a] border border-[#333333] rounded-2xl max-w-xl w-full p-6 space-y-4 relative max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingMember(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white border-b border-[#2e2e2e] pb-3">
              {isCreating ? 'Cadastrar Novo Membro' : `Editar Membro: ${editingMember?.internalCode}`}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1 font-semibold">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Unidade *</label>
                <select
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                >
                  {unitsList.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Tamanho de Referência *</label>
                <input
                  type="text"
                  required
                  value={formData.referenceSize || ''}
                  onChange={(e) => setFormData({ ...formData, referenceSize: e.target.value })}
                  placeholder="ex: Adulto M"
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Data de Nascimento</label>
                <input
                  type="date"
                  value={formData.birthDate || ''}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Sexo</label>
                <select
                  value={formData.gender || 'M'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Nome do Responsável *</label>
                <input
                  type="text"
                  required
                  value={formData.responsibleName || ''}
                  onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-semibold">Telefone Responsável *</label>
                <input
                  type="text"
                  required
                  value={formData.responsiblePhone || ''}
                  onChange={(e) => setFormData({ ...formData, responsiblePhone: e.target.value })}
                  className="w-full bg-[#111111] border border-[#333333] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#2e2e2e] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingMember(null);
                }}
                className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#F97316] text-black font-bold text-xs rounded hover:bg-orange-400"
              >
                Salvar Membro
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
