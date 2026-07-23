import ExcelJS from 'exceljs';
import { Member, MemberDuplicateCase } from '../types';

export interface ParsedMemberRow {
  rowNumber: number;
  data: Partial<Member>;
  rawValues: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

export interface ParseResult {
  fileName: string;
  totalRows: number;
  validRows: ParsedMemberRow[];
  errorRows: ParsedMemberRow[];
  duplicateCases: MemberDuplicateCase[];
}

export function normalizeName(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export function getCellStringValue(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val).trim();
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'object') {
    if (val.text !== undefined && val.text !== null) return String(val.text).trim();
    if (val.result !== undefined && val.result !== null) return String(val.result).trim();
    if (Array.isArray(val.richText)) {
      return val.richText.map((rt: any) => rt.text || '').join('').trim();
    }
  }
  return String(val).trim();
}

export async function parseMemberExcelFile(
  file: File,
  existingMembers: Member[]
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('O arquivo Excel enviado não possui planilhas válidas.');
  }

  // Find header row and column mapping
  let headerRowIndex = 1;
  const colMap: Record<string, number> = {};

  // Scan first 15 rows to find the best header row
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 15 || Object.keys(colMap).length > 0) return;

    const rowCells: { col: number; val: string }[] = [];
    row.eachCell((cell, colNumber) => {
      rowCells.push({ col: colNumber, val: getCellStringValue(cell.value).toUpperCase() });
    });

    const matchesHeader = rowCells.some((c) =>
      c.val.includes('NOME') || c.val.includes('USUARIO') || c.val.includes('DESBRAVADOR') || c.val.includes('UNIDADE')
    );

    if (matchesHeader) {
      headerRowIndex = rowNumber;
      rowCells.forEach(({ col, val }) => {
        if (val.includes('NOME DO USUARIO') || val === 'NOME' || val.includes('NOME COMPLETO') || val.includes('MEMBRO') || val.includes('DESBRAVADOR')) {
          if (!colMap['nome']) colMap['nome'] = col;
        }
        if (val.includes('UNIDADE') || val.includes('CLUBE')) {
          if (!colMap['unidade']) colMap['unidade'] = col;
        }
        if (val.includes('CELULAR DO USUARIO') || val.includes('CELULAR') || val === 'TELEFONE' || val.includes('CONTATO') || val.includes('WHATSAPP')) {
          if (!colMap['celular']) colMap['celular'] = col;
        }
        if (val.includes('DATA DE NASCIMENTO') || val.includes('NASCIMENTO') || val.includes('DT NASC') || val.includes('DATA NASC')) {
          if (!colMap['data_nascimento']) colMap['data_nascimento'] = col;
        }
        if (val.includes('ENDEREÇO') || val.includes('ENDERECO') || val.includes('LOGRADOURO')) {
          if (!colMap['endereco']) colMap['endereco'] = col;
        }
        if (val.includes('IDADE')) {
          if (!colMap['idade']) colMap['idade'] = col;
        }
        if (val.includes('NOME DA MÃE') || val.includes('NOME DA MAE') || val === 'MÃE' || val === 'MAE') {
          if (!colMap['nome_mae']) colMap['nome_mae'] = col;
        }
        if (val.includes('NOME DO PAI') || val === 'PAI') {
          if (!colMap['nome_pai']) colMap['nome_pai'] = col;
        }
        if (val.includes('TAMANHO') || val.includes('CAMISA') || val.includes('UNIFORME')) {
          if (!colMap['tamanho']) colMap['tamanho'] = col;
        }
        if (val.includes('RESPONSÁVEL') || val.includes('RESPONSAVEL')) {
          if (!colMap['responsavel']) colMap['responsavel'] = col;
        }
        if (val.includes('SEXO') || val.includes('GÊNERO') || val.includes('GENERO')) {
          if (!colMap['sexo']) colMap['sexo'] = col;
        }
        if (val.includes('TELEFONE DA MÃE') || val.includes('TEL MAE') || val.includes('CEL MAE')) {
          if (!colMap['tel_mae']) colMap['tel_mae'] = col;
        }
        if (val.includes('TELEFONE DO PAI') || val.includes('TEL PAI') || val.includes('CEL PAI')) {
          if (!colMap['tel_pai']) colMap['tel_pai'] = col;
        }
        if (val.includes('TELEFONE DO USUÁRIO') || val.includes('TEL USUARIO') || val.includes('TEL MEMBRO')) {
          if (!colMap['tel_usuario']) colMap['tel_usuario'] = col;
        }
        if (val.includes('RESPONSÁVEL') || val.includes('RESPONSAVEL') || val.includes('TEL RESP')) {
          if (val.includes('TEL') || val.includes('CEL') || val.includes('TELEFONE')) {
            if (!colMap['tel_responsavel']) colMap['tel_responsavel'] = col;
          }
        }
      });
    }
  });

  // If no specific header mapped for 'nome', fallback to column 1 or column with most text
  if (!colMap['nome']) {
    colMap['nome'] = 1;
  }

  const validRows: ParsedMemberRow[] = [];
  const errorRows: ParsedMemberRow[] = [];
  const duplicateCases: MemberDuplicateCase[] = [];

  let rowCounter = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return; // Skip header and above

    const rawValues: Record<string, any> = {};
    let rowHasData = false;

    row.eachCell((cell, colNumber) => {
      const valStr = getCellStringValue(cell.value);
      rawValues[colNumber] = valStr;
      if (valStr) rowHasData = true;
    });

    if (!rowHasData) return; // Skip completely empty rows

    rowCounter++;

    const getVal = (key: string): string => {
      const colIdx = colMap[key];
      if (!colIdx) return '';
      const cell = row.getCell(colIdx);
      return getCellStringValue(cell.value);
    };

    const name = getVal('nome');
    const unit = getVal('unidade') || 'Geral';
    const cellphone = getVal('celular');
    const birthDateRaw = getVal('data_nascimento');
    const address = getVal('endereco');
    const ageRaw = getVal('idade');
    const motherName = getVal('nome_mae');
    const fatherName = getVal('nome_pai');
    const size = getVal('tamanho') || 'Adulto M';
    const responsible = getVal('responsavel') || motherName || fatherName || name;
    const genderRaw = getVal('sexo');
    const motherPhone = getVal('tel_mae');
    const fatherPhone = getVal('tel_pai');
    const memberPhone = getVal('tel_usuario') || cellphone;
    const responsiblePhone = getVal('tel_responsavel') || motherPhone || cellphone;

    const errors: string[] = [];
    if (!name) errors.push('Nome do membro está em branco.');

    // Calculate age if birthDate present
    let age = parseInt(ageRaw) || 12;
    let birthDate = birthDateRaw;

    if (birthDateRaw) {
      if (birthDateRaw.includes('/')) {
        const parts = birthDateRaw.split('/');
        if (parts.length === 3) {
          birthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const bDate = new Date(birthDate);
      if (!isNaN(bDate.getTime())) {
        const today = new Date();
        age = today.getFullYear() - bDate.getFullYear();
      }
    } else {
      birthDate = '2014-01-01'; // Default birthdate if missing
    }

    const memberData: Partial<Member> = {
      internalCode: `M-${String(existingMembers.length + validRows.length + 1).padStart(4, '0')}`,
      name,
      unit,
      cellphone,
      birthDate,
      address,
      age,
      motherName,
      fatherName,
      referenceSize: size,
      responsibleName: responsible,
      gender: genderRaw.toUpperCase().startsWith('F') ? 'F' : 'M',
      motherPhone,
      fatherPhone,
      memberPhone,
      responsiblePhone,
      active: true,
      originalRowNumber: rowNumber
    };

    const parsedRow: ParsedMemberRow = {
      rowNumber,
      data: memberData,
      rawValues,
      isValid: errors.length === 0,
      errors
    };

    if (errors.length > 0) {
      errorRows.push(parsedRow);
    } else {
      validRows.push(parsedRow);

      // Check for potential duplicate in existing members
      const normName = normalizeName(name);
      if (normName) {
        const existingMatch = existingMembers.find((m) => {
          const exName = normalizeName(m.name);
          return exName === normName && m.birthDate === birthDate;
        });

        if (existingMatch) {
          duplicateCases.push({
            id: `dup-imp-${rowNumber}-${Date.now()}`,
            existingMember: existingMatch,
            newImportRow: memberData,
            similarityScore: 98,
            matchedFields: ['nome', 'data_nascimento'],
            status: 'pending'
          });
        }
      }
    }
  });

  return {
    fileName: file.name,
    totalRows: rowCounter,
    validRows,
    errorRows,
    duplicateCases
  };
}

export async function downloadImportErrorSheet(errorRows: ParsedMemberRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Erros de Importação');

  sheet.addRow(['Linha Original', 'Erros Encontrados', 'Nome Informado', 'Unidade Informada']);
  sheet.getRow(1).font = { bold: true };

  errorRows.forEach((r) => {
    sheet.addRow([
      r.rowNumber,
      r.errors.join('; '),
      r.data.name || 'Vazio',
      r.data.unit || 'Vazio'
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Erros_Importacao_Membros_${Date.now()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

