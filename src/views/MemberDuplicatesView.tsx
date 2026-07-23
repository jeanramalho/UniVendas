import React, { useState } from 'react';
import { Member, MemberDuplicateCase } from '../types';
import { UserCheck, CheckCircle2, ShieldAlert, GitMerge, ArrowRight, X } from 'lucide-react';
import { logAuditEvent } from '../lib/audit';

interface MemberDuplicatesViewProps {
  duplicates: MemberDuplicateCase[];
  onResolveDuplicate: (caseId: string, action: 'keep_both' | 'ignore_new' | 'update_existing' | 'merged', updatedMember?: Member) => void;
  userName: string;
}

export const MemberDuplicatesView: React.FC<MemberDuplicatesViewProps> = ({
  duplicates,
  onResolveDuplicate,
  userName
}) => {
  const pendingCases = duplicates.filter((d) => d.status === 'pending');
  const [selectedCase, setSelectedCase] = useState<MemberDuplicateCase | null>(
    pendingCases[0] || null
  );

  const handleAction = (action: 'keep_both' | 'ignore_new' | 'update_existing' | 'merged') => {
    if (!selectedCase) return;

    let updatedMember: Member | undefined = undefined;

    if (action === 'update_existing') {
      updatedMember = {
        ...selectedCase.existingMember,
        ...selectedCase.newImportRow,
        updatedAt: new Date().toISOString()
      };
    }

    onResolveDuplicate(selectedCase.id, action, updatedMember);
    logAuditEvent(
      'usr-current',
      userName,
      'RESOLVER_DUPLICIDADE_MEMBRO',
      'members',
      `Ação [${action}] aplicada para possível duplicidade de ${selectedCase.existingMember.name}`
    );

    // Pick next case
    const remaining = pendingCases.filter((c) => c.id !== selectedCase.id);
    setSelectedCase(remaining[0] || null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-[#F97316]" />
            <span>Revisão de Duplicidades Encontradas</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Existem {pendingCases.length} possíveis casos de membros duplicados pendentes de revisão manual.
          </p>
        </div>
      </div>

      {pendingCases.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-12 rounded-2xl text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Nenhum Caso de Duplicidade Pendente</h3>
          <p className="text-xs text-gray-400">
            Todos os registros de membros importados ou cadastrados foram revisados e consolidados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* List of Cases */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Fila de Casos ({pendingCases.length})
            </h3>

            {pendingCases.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selectedCase?.id === c.id
                    ? 'bg-[#F97316]/10 border-[#F97316] text-white'
                    : 'bg-[#1a1a1a] border-[#2e2e2e] text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-sm">{c.existingMember.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {c.existingMember.unit} • Nascimento: {c.existingMember.birthDate}
                </div>
                <div className="mt-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded inline-block">
                  Coincidência: {c.similarityScore}% ({c.matchedFields.join(', ')})
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Details & Actions */}
          {selectedCase && (
            <div className="md:col-span-2 bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-6 space-y-6">
              <h3 className="text-base font-bold text-white border-b border-[#2e2e2e] pb-3 flex items-center justify-between">
                <span>Comparação de Dados do Membro</span>
                <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                  Score {selectedCase.similarityScore}%
                </span>
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Existing Record */}
                <div className="bg-[#111111] p-4 rounded-xl border border-blue-500/30 space-y-2">
                  <span className="text-blue-400 font-bold block uppercase text-[10px] tracking-wider">
                    Registro Já Existente no Sistema
                  </span>

                  <div>
                    <span className="text-gray-500 block">Nome:</span>
                    <span className="font-bold text-white text-sm">{selectedCase.existingMember.name}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">Unidade:</span>
                    <span className="text-gray-300">{selectedCase.existingMember.unit}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">Data Nascimento:</span>
                    <span className="text-gray-300">{selectedCase.existingMember.birthDate}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">Tamanho Ref:</span>
                    <span className="text-amber-400 font-bold">{selectedCase.existingMember.referenceSize}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">Celular:</span>
                    <span className="text-gray-300 font-mono">{selectedCase.existingMember.cellphone}</span>
                  </div>
                </div>

                {/* New Import Record */}
                <div className="bg-[#111111] p-4 rounded-xl border border-amber-500/30 space-y-2">
                  <span className="text-amber-400 font-bold block uppercase text-[10px] tracking-wider">
                    Novo Registro Importado
                  </span>

                  <div>
                    <span className="text-gray-500 block">Nome:</span>
                    <span className="font-bold text-white text-sm">{selectedCase.newImportRow.name}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">Unidade:</span>
                    <span className="text-gray-300">{selectedCase.newImportRow.unit || '-'}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">Data Nascimento:</span>
                    <span className="text-gray-300">{selectedCase.newImportRow.birthDate || '-'}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">Tamanho Ref:</span>
                    <span className="text-amber-400 font-bold">{selectedCase.newImportRow.referenceSize || '-'}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block">Celular:</span>
                    <span className="text-gray-300 font-mono">{selectedCase.newImportRow.cellphone || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#2e2e2e] grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => handleAction('keep_both')}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs py-2.5 rounded-lg transition"
                >
                  Manter os Dois Registros
                </button>

                <button
                  onClick={() => handleAction('ignore_new')}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-semibold text-xs py-2.5 rounded-lg transition"
                >
                  Ignorar Novo
                </button>

                <button
                  onClick={() => handleAction('update_existing')}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs py-2.5 rounded-lg transition"
                >
                  Atualizar Existente
                </button>

                <button
                  onClick={() => handleAction('merged')}
                  className="bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs py-2.5 rounded-lg transition shadow-md"
                >
                  Mesclar Manualmente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
