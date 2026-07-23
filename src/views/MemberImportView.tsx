import React, { useState } from 'react';
import { Member, MemberDuplicateCase } from '../types';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import { parseMemberExcelFile, downloadImportErrorSheet, ParseResult } from '../lib/excelImport';
import { logAuditEvent } from '../lib/audit';

interface MemberImportViewProps {
  existingMembers: Member[];
  onConfirmImport: (newMembers: Member[], duplicates: MemberDuplicateCase[]) => Promise<boolean> | boolean;
  userName: string;
}

export const MemberImportView: React.FC<MemberImportViewProps> = ({
  existingMembers,
  onConfirmImport,
  userName
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [importedSuccess, setImportedSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = e.target.files[0];
    setFile(selected);
    setLoading(true);
    setErrorMsg('');
    setImportedSuccess(false);

    try {
      const result = await parseMemberExcelFile(selected, existingMembers);
      setParseResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao ler a planilha de membros.');
    } finally {
      setLoading(false);
    }
  };

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleConfirm = async () => {
    if (!parseResult) return;

    const newMembersToInsert: Member[] = parseResult.validRows.map((vr) => ({
      ...(vr.data as Member),
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    try {
      const saved = await onConfirmImport(newMembersToInsert, parseResult.duplicateCases);
      if (!saved) {
        setErrorMsg('A importação foi processada, mas não foi possível gravar os dados no Supabase.');
        return;
      }

      logAuditEvent(
      'usr-current',
      userName,
      'IMPORTAR_PLANILHA_MEMBROS',
      'members',
      `Importados ${newMembersToInsert.length} membros da planilha ${parseResult.fileName}`
      );

      setImportedSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao gravar os membros no Supabase.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Upload className="w-5 h-5 text-[#F97316]" />
          <span>Importação de Membros via Planilha Excel</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Selecione o arquivo <span className="text-[#F97316] font-mono">.xlsx</span> com os 15 campos originais dos membros do clube.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-[#1a1a1a] border-2 border-dashed border-[#333333] hover:border-[#F97316] p-8 rounded-2xl text-center space-y-4 transition">
        <div className="w-12 h-12 bg-[#F97316]/10 text-[#F97316] rounded-full flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-6 h-6" />
        </div>

        <div>
          <label className="cursor-pointer bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs px-5 py-2.5 rounded-lg inline-flex items-center space-x-2 transition shadow-lg">
            <Upload className="w-4 h-4" />
            <span>Selecionar Arquivo .XLSX</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <p className="text-[11px] text-gray-400 mt-2">
            Mapeamento automático das 15 colunas originais
          </p>
        </div>

        {file && (
          <div className="inline-block bg-[#111111] border border-[#2e2e2e] text-xs text-white px-3 py-1.5 rounded-md font-mono">
            Arquivo: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {loading && (
        <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
          Analisando linhas da planilha e verificando duplicidades...
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Preview Stats & Mapping Confirmation */}
      {parseResult && !importedSuccess && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
              <span className="text-xs text-gray-400">Total de Linhas Lidas</span>
              <div className="text-2xl font-black text-white">{parseResult.totalRows}</div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
              <span className="text-xs text-gray-400">Linhas Válidas</span>
              <div className="text-2xl font-black text-emerald-400">{parseResult.validRows.length}</div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
              <span className="text-xs text-gray-400">Linhas com Erro</span>
              <div className="text-2xl font-black text-red-400">{parseResult.errorRows.length}</div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2e2e2e] p-4 rounded-xl">
              <span className="text-xs text-gray-400">Possíveis Duplicidades</span>
              <div className="text-2xl font-black text-amber-400">{parseResult.duplicateCases.length}</div>
            </div>
          </div>

          {/* Error sheet download option */}
          {parseResult.errorRows.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-between">
              <div className="text-xs text-red-300">
                Atenção: Encontradas {parseResult.errorRows.length} linhas com incoerências. Você pode baixar a planilha de erros para correção.
              </div>
              <button
                onClick={() => downloadImportErrorSheet(parseResult.errorRows)}
                className="flex items-center space-x-1.5 bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded hover:bg-red-600 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Planilha de Erros</span>
              </button>
            </div>
          )}

          {/* Confirm Import Action */}
          <div className="flex items-center justify-end space-x-3 bg-[#111111] p-4 rounded-xl border border-[#222222]">
            <span className="text-xs text-gray-400">
              Pronto para gravar {parseResult.validRows.length} membros no sistema
            </span>
            <button
              onClick={handleConfirm}
              className="flex items-center space-x-2 bg-[#F97316] hover:bg-orange-400 text-black font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-lg"
            >
              <span>Confirmar Importação</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {importedSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-2xl text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Importação Concluída com Sucesso!</h3>
          <p className="text-xs text-gray-300 max-w-md mx-auto">
            Os membros foram adicionados ao UniVendas e já estão disponíveis para realização de vendas e controle de uniformes.
          </p>
        </div>
      )}
    </div>
  );
};
