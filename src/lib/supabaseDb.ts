import { supabase, isSupabaseConfigured } from './supabase';
import { Member, Product, Sale, PurchaseBatch, UserProfile } from '../types';

// ==========================================
// MEMBERS (Membros)
// ==========================================

export function memberToSupabaseRow(m: Member) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id);
  const row: any = {
    internal_code: m.internalCode,
    name: m.name,
    unit: m.unit || 'Geral',
    cellphone: m.cellphone || null,
    birth_date: m.birthDate || '2000-01-01',
    address: m.address || null,
    age: m.age || 0,
    mother_name: m.motherName || null,
    father_name: m.fatherName || null,
    reference_size: m.referenceSize || 'P',
    responsible_name: m.responsibleName || m.name,
    gender: m.gender || 'M',
    mother_phone: m.motherPhone || null,
    father_phone: m.fatherPhone || null,
    member_phone: m.memberPhone || null,
    responsible_phone: m.responsiblePhone || null,
    active: m.active !== false,
    original_row_number: m.originalRowNumber || null,
    notes: m.notes || null,
    updated_at: new Date().toISOString()
  };
  if (isUuid) {
    row.id = m.id;
  }
  return row;
}

export function rowToMember(r: any): Member {
  return {
    id: r.id,
    internalCode: r.internal_code || `M-${r.id.slice(0, 4)}`,
    name: r.name,
    unit: r.unit || 'Geral',
    cellphone: r.cellphone || '',
    birthDate: r.birth_date || '',
    address: r.address || '',
    age: r.age || 0,
    motherName: r.mother_name || '',
    fatherName: r.father_name || '',
    referenceSize: r.reference_size || '',
    responsibleName: r.responsible_name || r.name,
    gender: r.gender || 'M',
    motherPhone: r.mother_phone || '',
    fatherPhone: r.father_phone || '',
    memberPhone: r.member_phone || '',
    responsiblePhone: r.responsible_phone || '',
    active: r.active !== false,
    originalRowNumber: r.original_row_number,
    notes: r.notes || '',
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString()
  };
}

export async function fetchMembersFromSupabase(): Promise<Member[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase fetch members error:', error.message);
      return null;
    }
    return (data || []).map(rowToMember);
  } catch (err) {
    console.warn('Supabase fetch members failed:', err);
    return null;
  }
}

export async function saveMembersToSupabase(members: Member[]): Promise<boolean> {
  if (!isSupabaseConfigured || members.length === 0) return false;
  try {
    const rows = members.map(memberToSupabaseRow);
    const { error } = await supabase.from('members').upsert(rows, { onConflict: 'internal_code' });
    if (error) {
      console.warn('Supabase upsert members error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save members failed:', err);
    return false;
  }
}

export async function saveSingleMemberToSupabase(member: Member): Promise<boolean> {
  return saveMembersToSupabase([member]);
}

export async function deleteMemberFromSupabase(memberId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('members').delete().eq('id', memberId);
    if (error) {
      console.warn('Supabase delete member error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete member failed:', err);
    return false;
  }
}

// ==========================================
// PRODUCTS (Produtos)
// ==========================================

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: prods, error: pErr } = await supabase
      .from('products')
      .select('*, product_variants(*)');

    if (pErr) {
      console.warn('Supabase fetch products error:', pErr.message);
      return null;
    }

    return (prods || []).map((p: any) => ({
      id: p.id,
      code: p.code,
      sku: p.sku || p.code,
      name: p.name,
      description: p.description || '',
      categoryId: p.category_id || '',
      categoryName: p.category_name || '',
      imageUrl: p.image_url || '',
      supplierName: p.supplier_name || '',
      basePrice: Number(p.base_price || 0),
      costPrice: Number(p.cost_price || 0),
      active: p.active !== false,
      controlStock: p.control_stock !== false,
      allowSaleWithoutStock: p.allow_sale_without_stock !== false,
      minStock: p.min_stock || 5,
      variants: (p.product_variants || []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color || '',
        model: v.model || '',
        gender: v.gender || 'Unissex',
        price: Number(v.price || 0),
        costPrice: Number(v.cost_price || 0),
        physicalStock: Number(v.physical_stock || 0),
        reservedStock: Number(v.reserved_stock || 0)
      })),
      createdAt: p.created_at || new Date().toISOString(),
      updatedAt: p.updated_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Supabase fetch products failed:', err);
    return null;
  }
}

export async function saveProductToSupabase(product: Product): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
    const pRow: any = {
      code: product.code,
      sku: product.sku || product.code,
      name: product.name,
      description: product.description || null,
      supplier_name: product.supplierName || null,
      base_price: product.basePrice,
      cost_price: product.costPrice,
      active: product.active,
      control_stock: product.controlStock,
      allow_sale_without_stock: product.allowSaleWithoutStock,
      min_stock: product.minStock,
      updated_at: new Date().toISOString()
    };

    if (isUuid) pRow.id = product.id;

    const { data, error } = await supabase.from('products').upsert(pRow, { onConflict: 'code' }).select();
    if (error || !data || data.length === 0) {
      console.warn('Supabase upsert product error:', error?.message);
      return false;
    }

    const savedProductId = data[0].id;

    if (product.variants && product.variants.length > 0) {
      const variantRows = product.variants.map((v) => {
        const vIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id);
        const vr: any = {
          product_id: savedProductId,
          sku: v.sku || `${product.code}-${v.size}`,
          size: v.size,
          price: v.price,
          cost_price: v.costPrice,
          physical_stock: v.physicalStock,
          reserved_stock: v.reservedStock
        };
        if (vIsUuid) vr.id = v.id;
        return vr;
      });

      await supabase.from('product_variants').upsert(variantRows);
    }

    return true;
  } catch (err) {
    console.warn('Supabase save product failed:', err);
    return false;
  }
}

// ==========================================
// SALES (Vendas)
// ==========================================

export async function fetchSalesFromSupabase(): Promise<Sale[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: salesData, error } = await supabase
      .from('sales')
      .select('*, sale_items(*), payments(*)');

    if (error) {
      console.warn('Supabase fetch sales error:', error.message);
      return null;
    }

    return (salesData || []).map((s: any) => ({
      id: s.id,
      code: s.code,
      memberId: s.member_id,
      memberName: s.member_name,
      memberUnit: s.member_unit,
      memberPhone: s.member_phone || '',
      subtotal: Number(s.subtotal || 0),
      discount: Number(s.discount || 0),
      addition: Number(s.addition || 0),
      totalAmount: Number(s.total_amount || 0),
      paidAmount: Number(s.paid_amount || 0),
      pendingAmount: Number(s.pending_amount || 0),
      paymentStatus: s.payment_status,
      overallStatus: s.overall_status,
      notes: s.notes || '',
      createdBy: s.created_by || 'Sistema',
      createdAt: s.created_at || new Date().toISOString(),
      updatedAt: s.updated_at || new Date().toISOString(),
      items: (s.sale_items || []).map((si: any) => ({
        id: si.id,
        saleId: si.sale_id,
        isKit: si.is_kit || false,
        productId: si.product_id,
        productName: si.product_name,
        variantId: si.variant_id,
        size: si.size,
        quantity: si.quantity,
        unitPrice: Number(si.unit_price || 0),
        totalPrice: Number(si.total_price || 0),
        status: si.status,
        batchId: si.batch_id,
        batchCode: si.batch_code,
        deliveryId: si.delivery_id
      })),
      payments: (s.payments || []).map((p: any) => ({
        id: p.id,
        saleId: p.sale_id,
        amount: Number(p.amount || 0),
        method: p.method,
        status: p.status,
        paidAt: p.paid_at || new Date().toISOString(),
        registeredBy: p.registered_by || 'Sistema',
        createdAt: p.created_at || new Date().toISOString()
      }))
    }));
  } catch (err) {
    console.warn('Supabase fetch sales failed:', err);
    return null;
  }
}

export async function saveSaleToSupabase(sale: Sale): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sale.id);
    const saleRow: any = {
      code: sale.code,
      member_id: sale.memberId,
      member_name: sale.memberName,
      member_unit: sale.memberUnit,
      member_phone: sale.memberPhone || null,
      subtotal: sale.subtotal,
      discount: sale.discount,
      addition: sale.addition,
      total_amount: sale.totalAmount,
      paid_amount: sale.paidAmount,
      pending_amount: sale.pendingAmount,
      payment_status: sale.paymentStatus,
      overall_status: sale.overallStatus,
      notes: sale.notes || null,
      updated_at: new Date().toISOString()
    };
    if (isUuid) saleRow.id = sale.id;

    const { data, error } = await supabase.from('sales').upsert(saleRow, { onConflict: 'code' }).select();
    if (error || !data || data.length === 0) {
      console.warn('Supabase upsert sale error:', error?.message);
      return false;
    }

    const savedSaleId = data[0].id;

    if (sale.items && sale.items.length > 0) {
      const itemRows = sale.items.map((si) => {
        const itemIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(si.id);
        const ir: any = {
          sale_id: savedSaleId,
          is_kit: si.isKit || false,
          product_name: si.productName,
          size: si.size,
          quantity: si.quantity,
          unit_price: si.unitPrice,
          total_price: si.totalPrice,
          status: si.status
        };
        if (itemIsUuid) ir.id = si.id;
        return ir;
      });
      await supabase.from('sale_items').upsert(itemRows);
    }

    if (sale.payments && sale.payments.length > 0) {
      const payRows = sale.payments.map((p) => {
        const payIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
        const pr: any = {
          sale_id: savedSaleId,
          amount: p.amount,
          method: p.method,
          status: p.status,
          paid_at: p.paidAt
        };
        if (payIsUuid) pr.id = p.id;
        return pr;
      });
      await supabase.from('payments').upsert(payRows);
    }

    return true;
  } catch (err) {
    console.warn('Supabase save sale failed:', err);
    return false;
  }
}

// ==========================================
// USERS (Usuários)
// ==========================================

export async function saveUserToSupabase(user: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    const uRow: any = {
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      must_change_password: user.mustChangePassword
    };
    if (isUuid) uRow.id = user.id;

    const { error } = await supabase.from('profiles').upsert(uRow, { onConflict: 'email' });
    if (error) {
      console.warn('Supabase upsert profile error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save user failed:', err);
    return false;
  }
}
