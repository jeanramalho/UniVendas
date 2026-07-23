export type UserRole = 'master' | 'admin' | 'operator' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export type User = UserProfile;

export interface Member {
  id: string; // UUID
  internalCode: string; // e.g. M-001
  name: string; // NOME DO USUARIO
  unit: string; // NOME DA UNIDADE
  cellphone: string; // CELULAR DO USUARIO
  birthDate: string; // DATA DE NASCIMENTO (YYYY-MM-DD or DD/MM/AAAA)
  address: string; // ENDEREÇO DO USUÁRIO
  age: number; // IDADE
  motherName: string; // NOME DA MÃE
  fatherName: string; // NOME DO PAI
  referenceSize: string; // NOME DO TAMANHO
  responsibleName: string; // RESPONSÁVEL
  gender: 'M' | 'F' | 'Outro'; // SEXO
  motherPhone: string; // TELEFONE DA MÃE
  fatherPhone: string; // TELEFONE DO PAI
  memberPhone: string; // TELEFONE DO USUÁRIO
  responsiblePhone: string; // TELELEFONE DO RESPONSÁVEL
  active: boolean;
  importId?: string;
  originalRowNumber?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberDuplicateCase {
  id: string;
  existingMember: Member;
  newImportRow: Partial<Member>;
  similarityScore: number;
  matchedFields: string[];
  status: 'pending' | 'kept_both' | 'ignored_new' | 'updated_existing' | 'merged';
}

export interface MemberImportBatch {
  id: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  importedBy: string;
  importedAt: string;
  fileUrl?: string;
  errors?: { row: number; error: string; data: Record<string, any> }[];
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string; // e.g. 'Adulto M', 'Infantil 8'
  color?: string;
  model?: string;
  gender?: 'Masculino' | 'Feminino' | 'Unissex';
  price: number;
  costPrice: number;
  physicalStock: number;
  reservedStock: number;
}

export interface Product {
  id: string;
  code: string; // e.g. P-001
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  imageUrl?: string;
  supplierName?: string;
  basePrice: number; // Sale price
  costPrice: number; // Cost price
  active: boolean;
  controlStock: boolean;
  allowSaleWithoutStock: boolean;
  minStock: number;
  variants: ProductVariant[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KitItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  required: boolean;
  allowedSizes?: string[];
}

export interface Kit {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  originalPrice: number;
  discount: number;
  items: KitItem[];
  active: boolean;
  createdAt: string;
}

export type SaleStatus =
  | 'aguardando_pagamento'
  | 'paga'
  | 'parcialmente_atendida'
  | 'aguardando_pedido'
  | 'aguardando_fornecedor'
  | 'parcialmente_disponivel'
  | 'disponivel_entrega'
  | 'parcialmente_entregue'
  | 'entregue'
  | 'cancelada';

export type SaleItemStatus =
  | 'aguardando_pagamento'
  | 'pago'
  | 'em_estoque'
  | 'reservado'
  | 'pedido_a_fazer'
  | 'incluido_em_lote'
  | 'pedido_fechado'
  | 'pedido_enviado'
  | 'aguardando_fornecedor'
  | 'recebido_parcialmente'
  | 'recebido'
  | 'em_conferencia'
  | 'conferido_com_divergencia'
  | 'disponivel_entrega'
  | 'entregue'
  | 'cancelado'
  | 'devolvido'
  | 'trocado';

export interface SaleItemComponent {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  size: string;
  quantity: number;
  unitPrice: number;
  status: SaleItemStatus;
  batchId?: string;
  batchCode?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  isKit: boolean;
  kitId?: string;
  productId?: string;
  productName: string;
  variantId?: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: SaleItemStatus;
  components?: SaleItemComponent[]; // For kit components
  batchId?: string;
  batchCode?: string;
  deliveryId?: string;
}

export type PaymentMethod = 'PIX' | 'Dinheiro' | 'Cartão de crédito' | 'Cartão de débito' | 'Transferência' | 'Outro';
export type PaymentStatus = 'a_pagar' | 'parcialmente_pago' | 'pago' | 'vencido' | 'estornado' | 'cancelado';

export interface Payment {
  id: string;
  saleId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: string;
  dueDate?: string;
  registeredBy: string;
  notes?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  code: string; // e.g. V-2607-0001
  memberId: string;
  memberName: string;
  memberUnit: string;
  memberPhone: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  addition: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  overallStatus: SaleStatus;
  payments: Payment[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus =
  | 'rascunho'
  | 'fechado'
  | 'enviado_fornecedor'
  | 'confirmado_fornecedor'
  | 'em_producao'
  | 'em_transporte'
  | 'recebido_parcialmente'
  | 'recebido'
  | 'em_conferencia'
  | 'conferido'
  | 'finalizado'
  | 'cancelado';

export interface PurchaseBatchItem {
  id: string;
  batchId: string;
  saleItemId: string;
  saleCode: string;
  memberId: string;
  memberName: string;
  memberUnit: string;
  productId: string;
  productName: string;
  variantId: string;
  size: string;
  quantityRequested: number;
  quantityReceived: number;
  quantityMissing: number;
  quantitySurplus: number;
  quantityDamaged: number;
  unitCost: number;
  status: SaleItemStatus;
}

export interface PurchaseBatch {
  id: string;
  code: string; // e.g. L-2607-001
  supplierName: string;
  supplierContact?: string;
  externalOrderNumber?: string;
  status: BatchStatus;
  totalItems: number;
  estimatedCost: number;
  realCost?: number;
  shippingCost?: number;
  sentAt?: string;
  expectedDeliveryDate?: string;
  receivedAt?: string;
  items: PurchaseBatchItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface DeliveryRecord {
  id: string;
  saleId: string;
  saleCode: string;
  memberId: string;
  memberName: string;
  memberUnit: string;
  deliveredTo: string; // Name of person who picked it up
  deliveredBy: string;
  deliveredAt: string;
  items: {
    saleItemId: string;
    productName: string;
    size: string;
    quantity: number;
  }[];
  notes?: string;
}

export interface ReturnExchangeRecord {
  id: string;
  type: 'troca' | 'devolucao';
  saleId: string;
  saleCode: string;
  memberId: string;
  memberName: string;
  returnedItem: {
    productId: string;
    productName: string;
    size: string;
    quantity: number;
    condition: 'novo' | 'usado' | 'danificado';
  };
  newItem?: {
    productId: string;
    productName: string;
    size: string;
    quantity: number;
    priceDifference: number;
  };
  reason: string;
  processedBy: string;
  processedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  size: string;
  type: 'entrada_manual' | 'recebimento_fornecedor' | 'reserva_venda' | 'cancelamento_reserva' | 'saida_entrega' | 'ajuste_positivo' | 'ajuste_negativo' | 'devolucao' | 'troca' | 'perda' | 'dano' | 'correcao_inventario';
  quantity: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  saleId?: string;
  saleCode?: string;
  batchId?: string;
  batchCode?: string;
  createdBy: string;
  createdAt: string;
}

export interface InventoryCount {
  id: string;
  title: string;
  status: 'em_andamento' | 'concluido' | 'cancelado';
  startedBy: string;
  startedAt: string;
  finishedAt?: string;
  items: {
    productId: string;
    productName: string;
    variantId: string;
    size: string;
    systemStock: number;
    countedStock: number;
    discrepancy: number;
    justification?: string;
  }[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string; // e.g. 'sales', 'members', 'stock'
  resourceId?: string;
  details?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  justification?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AppSettings {
  clubLogoUrl: string;
  desbravadoresLogoUrl: string;
  clubName: string;
  seasonYear: string;
  allowSaleWithoutStock: boolean;
  autoReserveOnReceipt: boolean;
  minStockAlert: number;
  referenceSizes: string[];
}
