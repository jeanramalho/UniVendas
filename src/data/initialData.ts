import {
  Member,
  ProductCategory,
  Product,
  Kit,
  Sale,
  PurchaseBatch,
  AppSettings,
  StockMovement,
  AuditLog,
  UserProfile,
  MemberDuplicateCase
} from '../types';

export const INITIAL_SETTINGS: AppSettings = {
  clubLogoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&auto=format&fit=crop&q=80', // Default fallback asset
  desbravadoresLogoUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80',
  clubName: 'Clube de Desbravadores Pioneiros da Colina',
  seasonYear: '2026',
  allowSaleWithoutStock: true,
  autoReserveOnReceipt: true,
  minStockAlert: 5,
  referenceSizes: [
    'Infantil 2', 'Infantil 4', 'Infantil 6', 'Infantil 8', 'Infantil 10', 'Infantil 12', 'Infantil 14', 'Infantil 16',
    'Adulto PP', 'Adulto P', 'Adulto M', 'Adulto G', 'Adulto GG', 'Adulto XG', 'Adulto XXGG',
    'Baby Look PP', 'Baby Look P', 'Baby Look M', 'Baby Look G'
  ]
};

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-master-1',
    email: 'pioneirosdacolina@desbravadores.com',
    name: 'Diretoria Pioneiros da Colina',
    role: 'master',
    active: true,
    mustChangePassword: true,
    createdAt: '2026-01-01T08:00:00.000Z'
  }
];

export const INITIAL_CATEGORIES: ProductCategory[] = [
  { id: 'cat-1', name: 'Camisas', description: 'Camisas de atividades e oficiais', active: true },
  { id: 'cat-2', name: 'Calças', description: 'Calças de uniforme e passeio', active: true },
  { id: 'cat-3', name: 'Bermudas', description: 'Bermudas e calções', active: true },
  { id: 'cat-4', name: 'Agasalhos', description: 'Jaquetas e moletons oficiais', active: true },
  { id: 'cat-5', name: 'Bonés & Coberturas', description: 'Bonés e boinas', active: true },
  { id: 'cat-6', name: 'Lenços & Acessórios', description: 'Lenços, prendedores e faixas', active: true },
  { id: 'cat-7', name: 'Kits Promocionais', description: 'Kits completos com desconto', active: true }
];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_KITS: Kit[] = [];

export const INITIAL_MEMBERS: Member[] = [];

export const INITIAL_DUPLICATES: MemberDuplicateCase[] = [];

export const INITIAL_SALES: Sale[] = [];

export const INITIAL_BATCHES: PurchaseBatch[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-init-1',
    userId: 'usr-master-1',
    userName: 'Diretoria Pioneiros da Colina',
    action: 'INICIALIZACAO_SISTEMA',
    resource: 'system',
    details: 'Sistema UniVendas pronto para importação de membros e cadastro de produtos.',
    createdAt: new Date().toISOString()
  }
];
