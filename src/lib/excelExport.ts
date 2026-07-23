import ExcelJS from 'exceljs';
import { Member, Sale, PurchaseBatch, Product, Kit, AuditLog } from '../types';

export interface ExportMetadata {
  title: string;
  userName: string;
  filtersApplied?: string;
}

const BRAND_BLACK = '111111';
const BRAND_ORANGE = 'F97316';
const BRAND_GRAY_LIGHT = 'F5F5F5';
const BRAND_WHITE = 'FFFFFF';

function applyHeaderStyling(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + BRAND_BLACK }
    };
    cell.font = {
      bold: true,
      color: { argb: 'FF' + BRAND_WHITE },
      size: 11,
      name: 'Calibri'
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF' + BRAND_ORANGE } }
    };
  });
}

function applyMetadataHeader(worksheet: ExcelJS.Worksheet, meta: ExportMetadata) {
  // Title row
  const titleRow = worksheet.addRow(['UniVendas — Pioneiros da Colina', '', '']);
  worksheet.mergeCells(`A1:G1`);
  titleRow.height = 26;
  const titleCell = worksheet.getCell('A1');
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF' + BRAND_ORANGE } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Subtitle / Report info row
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR');
  const subRow = worksheet.addRow([`Relatório: ${meta.title}`, '', '', `Gerado por: ${meta.userName}`, '', '', `Data: ${dateStr}`]);
  worksheet.mergeCells(`A2:C2`);
  worksheet.mergeCells(`D2:F2`);
  subRow.height = 20;
  worksheet.getCell('A2').font = { bold: true, size: 11 };
  worksheet.getCell('D2').font = { italic: true, size: 10 };
  worksheet.getCell('G2').font = { size: 10 };

  if (meta.filtersApplied) {
    const filterRow = worksheet.addRow([`Filtros: ${meta.filtersApplied}`]);
    worksheet.mergeCells(`A3:G3`);
    filterRow.height = 18;
    worksheet.getCell('A3').font = { italic: true, size: 9, color: { argb: 'FF555555' } };
    worksheet.addRow([]); // Blank spacer
  } else {
    worksheet.addRow([]); // Blank spacer
  }
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 40);
  });
}

export async function exportMembersToExcel(members: Member[], meta: ExportMetadata) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Membros');

  applyMetadataHeader(sheet, meta);

  const headerRow = sheet.addRow([
    'Código',
    'Nome do Membro',
    'Unidade',
    'Sexo',
    'Idade',
    'Data de Nascimento',
    'Tamanho Ref.',
    'Celular',
    'Responsável',
    'Telefone Resp.',
    'Nome da Mãe',
    'Nome do Pai',
    'Status'
  ]);
  applyHeaderStyling(headerRow);

  members.forEach((m, idx) => {
    const row = sheet.addRow([
      m.internalCode,
      m.name,
      m.unit,
      m.gender === 'F' ? 'Feminino' : 'Masculino',
      m.age,
      m.birthDate,
      m.referenceSize,
      m.cellphone,
      m.responsibleName,
      m.responsiblePhone,
      m.motherName,
      m.fatherName,
      m.active ? 'Ativo' : 'Inativo'
    ]);

    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF' + BRAND_GRAY_LIGHT }
        };
      });
    }
  });

  autoFitColumns(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, `UniVendas_Membros_${Date.now()}.xlsx`);
}

export async function exportSalesToExcel(sales: Sale[], meta: ExportMetadata) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Vendas');

  applyMetadataHeader(sheet, meta);

  const headerRow = sheet.addRow([
    'Código Venda',
    'Data',
    'Membro',
    'Unidade',
    'Telefone',
    'Subtotal',
    'Desconto',
    'Total Venda',
    'Valor Pago',
    'Saldo Pendente',
    'Status Pagamento',
    'Status Atendimento'
  ]);
  applyHeaderStyling(headerRow);

  sales.forEach((s, idx) => {
    const row = sheet.addRow([
      s.code,
      new Date(s.createdAt).toLocaleDateString('pt-BR'),
      s.memberName,
      s.memberUnit,
      s.memberPhone,
      s.subtotal,
      s.discount,
      s.totalAmount,
      s.paidAmount,
      s.pendingAmount,
      s.paymentStatus.toUpperCase().replace('_', ' '),
      s.overallStatus.toUpperCase().replace('_', ' ')
    ]);

    // Format currencies
    [6, 7, 8, 9, 10].forEach((colIdx) => {
      row.getCell(colIdx).numFmt = 'R$ #,##0.00';
    });

    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF' + BRAND_GRAY_LIGHT }
        };
      });
    }
  });

  autoFitColumns(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, `UniVendas_Vendas_${Date.now()}.xlsx`);
}

export async function exportBatchToExcel(batch: PurchaseBatch, meta: ExportMetadata) {
  const workbook = new ExcelJS.Workbook();

  // Tab 1: Summary
  const sSummary = workbook.addWorksheet('Resumo do Lote');
  applyMetadataHeader(sSummary, { ...meta, title: `Lote ${batch.code} - Resumo` });

  sSummary.addRow(['Código do Lote', batch.code]);
  sSummary.addRow(['Fornecedor', batch.supplierName]);
  sSummary.addRow(['Status', batch.status.toUpperCase().replace('_', ' ')]);
  sSummary.addRow(['Data de Envio', batch.sentAt ? new Date(batch.sentAt).toLocaleDateString('pt-BR') : '-']);
  sSummary.addRow(['Previsão de Entrega', batch.expectedDeliveryDate || '-']);
  sSummary.addRow(['Total de Itens', batch.totalItems]);
  sSummary.addRow(['Custo Estimado Total', batch.estimatedCost]);
  sSummary.getCell('B7').numFmt = 'R$ #,##0.00';
  autoFitColumns(sSummary);

  // Tab 2: Grouped by Product & Size
  const sProd = workbook.addWorksheet('Agrupado por Produto');
  applyMetadataHeader(sProd, { ...meta, title: `Lote ${batch.code} - Agrupado por Produto` });

  const hProd = sProd.addRow(['Produto', 'Tamanho', 'Quantidade Solicitada', 'Custo Unitário', 'Subtotal Estimado']);
  applyHeaderStyling(hProd);

  // Grouping logic
  const groupMap = new Map<string, { name: string; size: string; qty: number; cost: number }>();
  batch.items.forEach((item) => {
    const key = `${item.productId}_${item.size}`;
    const existing = groupMap.get(key) || { name: item.productName, size: item.size, qty: 0, cost: item.unitCost };
    existing.qty += item.quantityRequested;
    groupMap.set(key, existing);
  });

  Array.from(groupMap.values()).forEach((g, idx) => {
    const row = sProd.addRow([g.name, g.size, g.qty, g.cost, g.qty * g.cost]);
    row.getCell(4).numFmt = 'R$ #,##0.00';
    row.getCell(5).numFmt = 'R$ #,##0.00';
    if (idx % 2 === 1) {
      row.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_GRAY_LIGHT } }));
    }
  });
  autoFitColumns(sProd);

  // Tab 3: Grouped by Member
  const sMbr = workbook.addWorksheet('Agrupado por Membro');
  applyMetadataHeader(sMbr, { ...meta, title: `Lote ${batch.code} - Agrupado por Membro` });

  const hMbr = sMbr.addRow(['Membro', 'Unidade', 'Cód. Venda', 'Produto', 'Tamanho', 'Qtd', 'Status']);
  applyHeaderStyling(hMbr);

  batch.items.forEach((item, idx) => {
    const row = sMbr.addRow([
      item.memberName,
      item.memberUnit,
      item.saleCode,
      item.productName,
      item.size,
      item.quantityRequested,
      item.status.toUpperCase().replace('_', ' ')
    ]);
    if (idx % 2 === 1) {
      row.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_GRAY_LIGHT } }));
    }
  });
  autoFitColumns(sMbr);

  // Tab 4: Conference sheet
  const sConf = workbook.addWorksheet('Ficha de Conferência');
  applyMetadataHeader(sConf, { ...meta, title: `Lote ${batch.code} - Conferência de Recebimento` });

  const hConf = sConf.addRow([
    'Produto',
    'Tamanho',
    'Membro Destino',
    'Qtd Pedida',
    'Qtd Recebida [  ]',
    'Qtd Faltante [  ]',
    'Qtd Excedente [  ]',
    'Qtd Danificada [  ]',
    'Observações da Conferência'
  ]);
  applyHeaderStyling(hConf);

  batch.items.forEach((item) => {
    sConf.addRow([
      item.productName,
      item.size,
      item.memberName,
      item.quantityRequested,
      item.quantityReceived || '',
      item.quantityMissing || '',
      item.quantitySurplus || '',
      item.quantityDamaged || '',
      ''
    ]);
  });
  autoFitColumns(sConf);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, `UniVendas_Lote_${batch.code}_${Date.now()}.xlsx`);
}

export async function exportAuditLogsToExcel(logs: AuditLog[], meta: ExportMetadata) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Auditoria');

  applyMetadataHeader(sheet, meta);

  const headerRow = sheet.addRow([
    'ID Registro',
    'Data/Hora',
    'Operador',
    'Ação Executada',
    'Módulo Afetado',
    'Detalhes do Evento'
  ]);
  applyHeaderStyling(headerRow);

  logs.forEach((l, idx) => {
    const row = sheet.addRow([
      l.id,
      new Date(l.createdAt).toLocaleString('pt-BR'),
      l.userName,
      l.action,
      l.resource,
      l.details || ''
    ]);

    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF' + BRAND_GRAY_LIGHT }
        };
      });
    }
  });

  autoFitColumns(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, `UniVendas_Auditoria_${Date.now()}.xlsx`);
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
