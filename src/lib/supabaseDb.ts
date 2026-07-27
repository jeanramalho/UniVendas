import { supabase, isSupabaseConfigured } from './supabase';
import {
  AuditLog,
  AppSettings,
  Kit,
  Member,
  Product,
  ProductCategory,
  PurchaseBatch,
  Sale,
  UserProfile
} from '../types';

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

function rowToProduct(p: any): Product {
  const savedSizes = (p.product_sizes || [])
    .filter((s: any) => s.active !== false)
    .sort((a: any, b: any) => (a.size_order || 0) - (b.size_order || 0))
    .map((s: any) => s.size_name);
  const allowedSizeSet = savedSizes.length > 0 ? new Set(savedSizes) : null;
  const existingVariants = (p.product_variants || []).filter((v: any) => !allowedSizeSet || allowedSizeSet.has(v.size));
  const variantsBySize = new Map(existingVariants.map((v: any) => [v.size, v]));
  const orderedVariantRows =
    savedSizes.length > 0
      ? savedSizes.map((sizeName) => {
          const existing = variantsBySize.get(sizeName);
          return (
            existing || {
              id: `missing-variant-${p.id}-${sizeName}`,
              sku: `${p.sku || p.code}-${sizeName.replace(/\s+/g, '').toUpperCase()}`,
              size: sizeName,
              color: '',
              model: '',
              gender: 'Unissex',
              price: p.base_price,
              cost_price: p.cost_price,
              physical_stock: 0,
              reserved_stock: 0
            }
          );
        })
      : existingVariants.sort((a: any, b: any) => a.size.localeCompare(b.size));

  return {
    id: p.id,
    code: p.code,
    sku: p.sku || p.code,
    name: p.name,
    description: p.description || '',
    categoryId: p.category_id || '',
    categoryName: p.product_categories?.name || '',
    imageUrl: p.image_url || '',
    supplierName: p.supplier_name || '',
    basePrice: Number(p.base_price || 0),
    costPrice: Number(p.cost_price || 0),
    active: p.active !== false,
    controlStock: p.control_stock !== false,
    allowSaleWithoutStock: p.allow_sale_without_stock !== false,
    minStock: p.min_stock || 5,
    variants: orderedVariantRows.map((v: any) => ({
        id: String(v.id),
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
  };
}

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: prods, error: pErr } = await supabase
      .from('products')
      .select('*, product_categories(name), product_variants(*), product_sizes(*)');

    if (pErr) {
      console.warn('Supabase fetch products error:', pErr.message);
      return null;
    }

    const products = (prods || []).map(rowToProduct);
    return await Promise.all(
      products.map(async (product) => {
        const hasMissingVariants = product.variants.some((variant) => variant.id.startsWith('missing-variant-'));
        if (!hasMissingVariants) return product;

        return (await saveProductToSupabase(product)) || product;
      })
    );
  } catch (err) {
    console.warn('Supabase fetch products failed:', err);
    return null;
  }
}

export async function saveProductToSupabase(product: Product): Promise<Product | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
    const categoryIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.categoryId);
    const pRow: any = {
      code: product.code,
      sku: product.sku || product.code,
      name: product.name,
      description: product.description || null,
      category_id: categoryIsUuid ? product.categoryId : null,
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
      return null;
    }

    const savedProductId = data[0].id;

    if (product.variants && product.variants.length > 0) {
      const variantSizes = product.variants.map((v) => v.size);
      const { error: deleteErr } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', savedProductId)
        .not('size', 'in', `(${variantSizes.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',')})`);

      if (deleteErr) {
        console.warn('Supabase delete stale product variants error:', deleteErr.message);
      }

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

    const { data: savedProduct, error: fetchErr } = await supabase
      .from('products')
      .select('*, product_categories(name), product_variants(*), product_sizes(*)')
      .eq('id', savedProductId)
      .maybeSingle();

    if (fetchErr || !savedProduct) {
      console.warn('Supabase fetch saved product error:', fetchErr?.message);
      return { ...product, id: savedProductId };
    }

    return rowToProduct(savedProduct);
  } catch (err) {
    console.warn('Supabase save product failed:', err);
    return null;
  }
}

export async function deleteProductFromSupabase(productId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.warn('Supabase delete product error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Supabase delete product failed:', err);
    return false;
  }
}

// ==========================================
// PRODUCT SIZES (Tamanhos de Produtos)
// ==========================================

export interface ProductSize {
  id: string;
  productId: string;
  sizeName: string;
  sizeOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchProductSizes(productId: string): Promise<ProductSize[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('product_sizes')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true)
      .order('size_order', { ascending: true });

    if (error) {
      console.warn('Supabase fetch product sizes error:', error.message);
      return null;
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      productId: s.product_id,
      sizeName: s.size_name,
      sizeOrder: s.size_order,
      active: s.active,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));
  } catch (err) {
    console.warn('Supabase fetch product sizes failed:', err);
    return null;
  }
}

export async function addProductSize(
  productId: string,
  sizeName: string,
  sizeOrder: number = 0
): Promise<ProductSize | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('product_sizes')
      .insert({
        product_id: productId,
        size_name: sizeName,
        size_order: sizeOrder,
        active: true
      })
      .select();

    if (error) {
      console.warn('Supabase add product size error:', error.message);
      return null;
    }

    if (!data || data.length === 0) return null;

    const s = data[0];
    return {
      id: s.id,
      productId: s.product_id,
      sizeName: s.size_name,
      sizeOrder: s.size_order,
      active: s.active,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    };
  } catch (err) {
    console.warn('Supabase add product size failed:', err);
    return null;
  }
}

export async function updateProductSize(
  sizeId: string,
  sizeName?: string,
  sizeOrder?: number,
  active?: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const updates: any = { updated_at: new Date().toISOString() };
    if (sizeName !== undefined) updates.size_name = sizeName;
    if (sizeOrder !== undefined) updates.size_order = sizeOrder;
    if (active !== undefined) updates.active = active;

    const { error } = await supabase
      .from('product_sizes')
      .update(updates)
      .eq('id', sizeId);

    if (error) {
      console.warn('Supabase update product size error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Supabase update product size failed:', err);
    return false;
  }
}

export async function deleteProductSize(sizeId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('product_sizes')
      .delete()
      .eq('id', sizeId);

    if (error) {
      console.warn('Supabase delete product size error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Supabase delete product size failed:', err);
    return false;
  }
}

export async function saveProductSizesToSupabase(productId: string, sizeNames: string[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const normalizedSizes = Array.from(new Set(sizeNames.map((size) => size.trim()).filter(Boolean)));

    if (normalizedSizes.length === 0) {
      const { error } = await supabase.from('product_sizes').delete().eq('product_id', productId);
      if (error) {
        console.warn('Supabase clear product sizes error:', error.message);
        return false;
      }
      return true;
    }

    const { error: deleteErr } = await supabase
      .from('product_sizes')
      .delete()
      .eq('product_id', productId)
      .not('size_name', 'in', `(${normalizedSizes.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',')})`);

    if (deleteErr) {
      console.warn('Supabase delete stale product sizes error:', deleteErr.message);
      return false;
    }

    const rows = normalizedSizes.map((sizeName, index) => ({
      product_id: productId,
      size_name: sizeName,
      size_order: index + 1,
      active: true,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('product_sizes')
      .upsert(rows, { onConflict: 'product_id,size_name' });

    if (error) {
      console.warn('Supabase upsert product sizes error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Supabase save product sizes failed:', err);
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
      .select('*, sale_items(*, sale_item_components(*)), payments(*)');

    if (error) {
      console.warn('Supabase fetch sales error:', error.message);
      return null;
    }

    return (salesData || []).map((s: any) => {
      const rawItems = (s.sale_items || []).map((si: any) => ({
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
        deliveryId: si.delivery_id,
        components: (si.sale_item_components || []).map((component: any) => ({
          id: component.id,
          productId: component.product_id,
          productName: component.product_name,
          variantId: component.variant_id,
          size: component.size,
          quantity: Number(component.quantity || 0),
          unitPrice: Number(component.unit_price || 0),
          status: component.status
        }))
      }));

      // Deduplicate items if legacy duplicate rows exist in database
      const uniqueItemsMap = new Map<string, typeof rawItems[0]>();
      rawItems.forEach((item: any) => {
        // Unique key combines id or item content
        const itemKey = item.id;
        if (!uniqueItemsMap.has(itemKey)) {
          uniqueItemsMap.set(itemKey, item);
        }
      });

      return {
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
        items: Array.from(uniqueItemsMap.values()),
        payments: (s.payments || []).map((p: any) => ({
          id: p.id,
          saleId: p.sale_id,
          amount: Number(p.amount || 0),
          method: p.method,
          status: p.status,
          paidAt: p.paid_at || new Date().toISOString(),
          registeredBy: p.registered_by || 'Sistema',
          createdAt: p.created_at || new Date().toISOString(),
          cardholderName: p.cardholder_name || undefined,
          cardholderIsMember: p.cardholder_is_member !== undefined ? p.cardholder_is_member : undefined
        }))
      };
    });
  } catch (err) {
    console.warn('Supabase fetch sales failed:', err);
    return null;
  }
}

export async function saveSaleToSupabase(sale: Sale): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const isUuidValue = (value?: string) =>
      Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
    const isUuid = isUuidValue(sale.id);
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
      const currentItemIds = sale.items.map((si) => si.id).filter(isUuidValue);
      if (currentItemIds.length > 0) {
        const { error: deleteStaleItemsError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', savedSaleId)
          .not('id', 'in', `(${currentItemIds.join(',')})`);

        if (deleteStaleItemsError) {
          console.warn('Supabase delete stale sale items error:', deleteStaleItemsError.message);
        }
      }

      const itemRows = sale.items.map((si) => {
        const itemIsUuid = isUuidValue(si.id);
        const ir: any = {
          sale_id: savedSaleId,
          is_kit: si.isKit || false,
          kit_id: isUuidValue(si.kitId) ? si.kitId : null,
          product_id: isUuidValue(si.productId) ? si.productId : null,
          product_name: si.productName,
          variant_id: isUuidValue(si.variantId) ? si.variantId : null,
          size: si.size,
          quantity: si.quantity,
          unit_price: si.unitPrice,
          total_price: si.totalPrice,
          status: si.status,
          batch_id: isUuidValue(si.batchId) ? si.batchId : null,
          batch_code: si.batchCode || null,
          delivery_id: isUuidValue(si.deliveryId) ? si.deliveryId : null
        };
        if (itemIsUuid) ir.id = si.id;
        return ir;
      });

      const { data: savedItems, error: itemError } = await supabase
        .from('sale_items')
        .upsert(itemRows)
        .select('id, product_name, size');

      if (itemError) {
        console.warn('Supabase upsert sale items error:', itemError.message);
        return false;
      }

      const savedItemIds = (savedItems || []).map((item: any) => item.id);
      if (savedItemIds.length > 0) {
        await supabase.from('sale_item_components').delete().in('sale_item_id', savedItemIds);
      }

      const savedItemsByKey = new Map(
        (savedItems || []).map((item: any) => [`${item.product_name}-${item.size}`, item.id])
      );
      const componentRows = sale.items.flatMap((si) => {
        const saleItemId = isUuidValue(si.id) ? si.id : savedItemsByKey.get(`${si.productName}-${si.size}`);
        if (!saleItemId) return [];

        return (si.components || []).map((component) => ({
          sale_item_id: saleItemId,
          product_id: isUuidValue(component.productId) ? component.productId : null,
          product_name: component.productName,
          variant_id: isUuidValue(component.variantId) ? component.variantId : null,
          size: component.size,
          quantity: component.quantity,
          unit_price: component.unitPrice,
          status: component.status
        }));
      });

      if (componentRows.length > 0) {
        const { error: componentError } = await supabase.from('sale_item_components').insert(componentRows);
        if (componentError) {
          console.warn('Supabase insert sale item components error:', componentError.message);
          return false;
        }
      }
    }

    if (sale.payments && sale.payments.length > 0) {
      const payRows = sale.payments.map((p) => {
        const payIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
        const pr: any = {
          sale_id: savedSaleId,
          amount: p.amount,
          method: p.method,
          status: p.status,
          paid_at: p.paidAt,
          cardholder_name: p.cardholderName || null,
          cardholder_is_member: p.cardholderIsMember !== undefined ? p.cardholderIsMember : null
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
    const uRow: any = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      must_change_password: user.mustChangePassword
    };

    const { error } = await supabase.from('profiles').upsert(uRow, { onConflict: 'id' });
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

export async function fetchProfileByEmailFromSupabase(email: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !email) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch profile by email error:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      active: data.active !== false,
      mustChangePassword: data.must_change_password !== false,
      createdAt: data.created_at || new Date().toISOString(),
      lastLoginAt: data.last_login_at || undefined
    };
  } catch (err) {
    console.warn('Supabase fetch profile by email failed:', err);
    return null;
  }
}

export async function fetchProfileByIdFromSupabase(id: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !id) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();

    if (error) {
      console.warn('Supabase fetch profile by id error:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      active: data.active !== false,
      mustChangePassword: data.must_change_password !== false,
      createdAt: data.created_at || new Date().toISOString(),
      lastLoginAt: data.last_login_at || undefined
    };
  } catch (err) {
    console.warn('Supabase fetch profile by id failed:', err);
    return null;
  }
}

export async function fetchProfilesFromSupabase(): Promise<UserProfile[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) {
      console.warn('Supabase fetch profiles error:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      active: row.active !== false,
      mustChangePassword: row.must_change_password !== false,
      createdAt: row.created_at || new Date().toISOString(),
      lastLoginAt: row.last_login_at || undefined
    }));
  } catch (err) {
    console.warn('Supabase fetch profiles failed:', err);
    return null;
  }
}

// ==========================================
// CATEGORIES, SETTINGS, KITS, BATCHES, AUDIT
// ==========================================

export async function fetchCategoriesFromSupabase(): Promise<ProductCategory[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('product_categories').select('*').order('name', { ascending: true });
    if (error) {
      console.warn('Supabase fetch categories error:', error.message);
      return null;
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      active: row.active !== false
    }));
  } catch (err) {
    console.warn('Supabase fetch categories failed:', err);
    return null;
  }
}

export async function saveCategoriesToSupabase(categories: ProductCategory[]): Promise<boolean> {
  if (!isSupabaseConfigured || categories.length === 0) return false;
  try {
    const rows = categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description || null,
      active: category.active
    }));
    const { error } = await supabase.from('product_categories').upsert(rows, { onConflict: 'name' });
    if (error) {
      console.warn('Supabase save categories error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save categories failed:', err);
    return false;
  }
}

export async function fetchAppSettingsFromSupabase(): Promise<AppSettings | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (error) {
      console.warn('Supabase fetch settings error:', error.message);
      return null;
    }
    if (!data) return null;
    return {
      clubLogoUrl: data.club_logo_url || '',
      desbravadoresLogoUrl: data.desbravadores_logo_url || '',
      clubName: data.club_name || 'Clube de Desbravadores Pioneiros da Colina',
      seasonYear: data.season_year || '2026',
      allowSaleWithoutStock: data.allow_sale_without_stock !== false,
      autoReserveOnReceipt: data.auto_reserve_on_receipt !== false,
      minStockAlert: data.min_stock_alert ?? 5,
      referenceSizes: Array.isArray(data.reference_sizes) ? data.reference_sizes : []
    };
  } catch (err) {
    console.warn('Supabase fetch settings failed:', err);
    return null;
  }
}

export async function saveAppSettingsToSupabase(settings: AppSettings): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const row = {
      id: 1,
      club_logo_url: settings.clubLogoUrl || null,
      desbravadores_logo_url: settings.desbravadoresLogoUrl || null,
      club_name: settings.clubName,
      season_year: settings.seasonYear,
      allow_sale_without_stock: settings.allowSaleWithoutStock,
      auto_reserve_on_receipt: settings.autoReserveOnReceipt,
      min_stock_alert: settings.minStockAlert,
      reference_sizes: settings.referenceSizes
    };
    const { error } = await supabase.from('app_settings').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase save settings error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save settings failed:', err);
    return false;
  }
}

export async function fetchKitsFromSupabase(): Promise<Kit[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('kits').select('*, kit_items(*)').order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetch kits error:', error.message);
      return null;
    }
    return (data || []).map((kit: any) => ({
      id: kit.id,
      code: kit.code,
      name: kit.name,
      description: kit.description || '',
      price: Number(kit.price || 0),
      originalPrice: Number(kit.original_price || 0),
      discount: Number(kit.discount || 0),
      items: (kit.kit_items || []).map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name || '',
        quantity: Number(item.quantity || 1),
        required: item.required !== false,
        allowedSizes: item.allowed_sizes || []
      })),
      active: kit.active !== false,
      createdAt: kit.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Supabase fetch kits failed:', err);
    return null;
  }
}

export async function saveKitToSupabase(kit: Kit): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const kitRow = {
      id: kit.id,
      code: kit.code,
      name: kit.name,
      description: kit.description || null,
      price: kit.price,
      original_price: kit.originalPrice,
      discount: kit.discount,
      active: kit.active
    };

    const { data, error } = await supabase.from('kits').upsert(kitRow, { onConflict: 'code' }).select('id');
    if (error || !data || data.length === 0) {
      console.warn('Supabase save kit error:', error?.message);
      return false;
    }

    const savedKitId = data[0].id;
    await supabase.from('kit_items').delete().eq('kit_id', savedKitId);

    if (kit.items.length > 0) {
      const itemRows = kit.items.map((item) => ({
        kit_id: savedKitId,
        product_id: item.productId,
        quantity: item.quantity,
        required: item.required,
        allowed_sizes: item.allowedSizes || []
      }));
      const { error: itemsError } = await supabase.from('kit_items').insert(itemRows);
      if (itemsError) {
        console.warn('Supabase save kit items error:', itemsError.message);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn('Supabase save kit failed:', err);
    return false;
  }
}

export async function fetchPurchaseBatchesFromSupabase(): Promise<PurchaseBatch[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('purchase_batches')
      .select('*, purchase_batch_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch batches error:', error.message);
      return null;
    }

    return (data || []).map((batch: any) => ({
      id: batch.id,
      code: batch.code,
      supplierName: batch.supplier_name,
      supplierContact: batch.supplier_contact || '',
      externalOrderNumber: batch.external_order_number || '',
      status: batch.status,
      totalItems: Number(batch.total_items || 0),
      estimatedCost: Number(batch.estimated_cost || 0),
      realCost: batch.real_cost !== null && batch.real_cost !== undefined ? Number(batch.real_cost) : undefined,
      shippingCost: batch.shipping_cost !== null && batch.shipping_cost !== undefined ? Number(batch.shipping_cost) : undefined,
      sentAt: batch.sent_at || '',
      expectedDeliveryDate: batch.expected_delivery_date || '',
      receivedAt: batch.received_at || '',
      notes: batch.notes || '',
      createdBy: batch.created_by || '',
      createdAt: batch.created_at || new Date().toISOString(),
      updatedAt: batch.updated_at || new Date().toISOString(),
      items: (batch.purchase_batch_items || []).map((item: any) => ({
        id: item.id,
        batchId: item.batch_id,
        saleItemId: item.sale_item_id,
        saleCode: item.sale_code,
        memberId: item.member_id,
        memberName: item.member_name,
        memberUnit: item.member_unit,
        productId: item.product_id,
        productName: item.product_name,
        variantId: item.variant_id || '',
        size: item.size,
        quantityRequested: Number(item.quantity_requested || 0),
        quantityReceived: Number(item.quantity_received || 0),
        quantityMissing: Number(item.quantity_missing || 0),
        quantitySurplus: Number(item.quantity_surplus || 0),
        quantityDamaged: Number(item.quantity_damaged || 0),
        unitCost: Number(item.unit_cost || 0),
        status: item.status
      }))
    }));
  } catch (err) {
    console.warn('Supabase fetch batches failed:', err);
    return null;
  }
}

export async function savePurchaseBatchToSupabase(batch: PurchaseBatch): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const row = {
      id: batch.id,
      code: batch.code,
      supplier_name: batch.supplierName,
      supplier_contact: batch.supplierContact || null,
      external_order_number: batch.externalOrderNumber || null,
      status: batch.status,
      total_items: batch.totalItems,
      estimated_cost: batch.estimatedCost,
      real_cost: batch.realCost ?? null,
      shipping_cost: batch.shippingCost ?? null,
      sent_at: batch.sentAt || null,
      expected_delivery_date: batch.expectedDeliveryDate || null,
      received_at: batch.receivedAt || null,
      notes: batch.notes || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('purchase_batches').upsert(row, { onConflict: 'code' }).select('id');
    if (error || !data || data.length === 0) {
      console.warn('Supabase save batch error:', error?.message);
      return false;
    }

    const savedBatchId = data[0].id;
    await supabase.from('purchase_batch_items').delete().eq('batch_id', savedBatchId);

    if (batch.items.length > 0) {
      const itemRows = batch.items.map((item) => ({
        batch_id: savedBatchId,
        sale_item_id: item.saleItemId,
        sale_code: item.saleCode,
        member_id: item.memberId,
        member_name: item.memberName,
        member_unit: item.memberUnit,
        product_id: item.productId,
        product_name: item.productName,
        variant_id: item.variantId || null,
        size: item.size,
        quantity_requested: item.quantityRequested,
        quantity_received: item.quantityReceived,
        quantity_missing: item.quantityMissing,
        quantity_surplus: item.quantitySurplus,
        quantity_damaged: item.quantityDamaged,
        unit_cost: item.unitCost,
        status: item.status
      }));
      const { error: itemsError } = await supabase.from('purchase_batch_items').insert(itemRows);
      if (itemsError) {
        console.warn('Supabase save batch items error:', itemsError.message);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn('Supabase save batch failed:', err);
    return false;
  }
}

export async function fetchAuditLogsFromSupabase(): Promise<AuditLog[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetch audit logs error:', error.message);
      return null;
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id || '',
      userName: row.user_name,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id || '',
      details: row.details || '',
      oldValues: row.old_values || undefined,
      newValues: row.new_values || undefined,
      justification: row.justification || '',
      createdAt: row.created_at || new Date().toISOString(),
      ipAddress: row.ip_address || ''
    }));
  } catch (err) {
    console.warn('Supabase fetch audit logs failed:', err);
    return null;
  }
}

export async function saveAuditLogToSupabase(log: AuditLog): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const row = {
      id: log.id,
      user_id: log.userId,
      user_name: log.userName,
      action: log.action,
      resource: log.resource,
      resource_id: log.resourceId || null,
      details: log.details || null,
      old_values: log.oldValues || null,
      new_values: log.newValues || null,
      justification: log.justification || null,
      ip_address: log.ipAddress || null,
      created_at: log.createdAt
    };
    const { error } = await supabase.from('audit_logs').insert(row);
    if (error) {
      console.warn('Supabase save audit log error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save audit log failed:', err);
    return false;
  }
}
