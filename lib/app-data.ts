import type {
  InventoryItem,
  InventoryMovement,
  MenuProduct,
  ProductionBatch,
  Purchase,
  Recipe,
  Supplier
} from "@/lib/domain";
import {
  inventoryItems as demoInventoryItems,
  menuProducts as demoMenuProducts,
  movements as demoMovements,
  productionBatches as demoProductionBatches,
  purchases as demoPurchases,
  recipes as demoRecipes,
  sales as demoSales,
  suppliers as demoSuppliers
} from "@/lib/sample-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppData = {
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  recipes: Recipe[];
  menuProducts: MenuProduct[];
  purchases: Purchase[];
  productionBatches: ProductionBatch[];
  sales: typeof demoSales;
  movements: InventoryMovement[];
  source: "supabase" | "demo";
};

export const demoAppData: AppData = {
  inventoryItems: demoInventoryItems,
  suppliers: demoSuppliers,
  recipes: demoRecipes,
  menuProducts: demoMenuProducts,
  purchases: demoPurchases,
  productionBatches: demoProductionBatches,
  sales: demoSales,
  movements: demoMovements,
  source: "demo"
};

type CategoryRow = {
  id: string;
  name: string;
};

type SupplierRow = {
  id: string;
  name: string;
  company: string | null;
  contact: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  socials: string | null;
  website: string | null;
  notes: string | null;
};

type InventoryRow = {
  id: string;
  code: string;
  name: string;
  category_id: string | null;
  kind: InventoryItem["kind"];
  description: string | null;
  unit: string;
  quantity: number | string;
  minimum_quantity: number | string;
  maximum_quantity: number | string;
  purchase_cost: number | string;
  average_cost: number | string;
  reference_price: number | string;
  status: InventoryItem["status"];
  location: string | null;
  barcode: string | null;
  image_url: string | null;
  supplier_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type MenuProductRow = {
  id: string;
  sku: string;
  name: string;
  category_id: string | null;
  price: number | string;
  favorite: boolean;
  active: boolean;
};

type RecipeRow = {
  id: string;
  product_id: string;
  version: number;
  is_active: boolean;
};

type RecipeItemRow = {
  recipe_id: string;
  inventory_item_id: string;
  quantity: number | string;
  unit: string;
  unit_cost_snapshot: number | string;
};

type PurchaseRow = {
  id: string;
  supplier_id: string;
  invoice_number: string;
  purchased_at: string;
};

type PurchaseLineRow = {
  purchase_id: string;
  inventory_item_id: string;
  quantity: number | string;
  unit_cost: number | string;
  tax_rate: number | string;
  discount: number | string;
};

type ProductionBatchRow = {
  id: string;
  output_item_id: string;
  quantity_produced: number | string;
  total_cost: number | string;
  produced_at: string;
};

type SaleRow = {
  id: string;
  invoice_number: string;
  sold_at: string;
  payment_method: "cash" | "card" | "transfer" | "mixed";
  discount: number | string;
};

type SaleLineRow = {
  sale_id: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
  unit_cost_snapshot: number | string;
};

type MovementRow = {
  id: string;
  inventory_item_id: string;
  type: InventoryMovement["type"];
  quantity: number | string;
  unit_cost: number | string;
  occurred_at: string;
  reference_table: string | null;
  reference_id: string | null;
  notes: string | null;
};

function numberValue(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function textValue(value: string | null | undefined) {
  return value ?? "";
}

function byId<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

async function selectTable<T>(table: string, orderColumn = "created_at") {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from(table).select("*").order(orderColumn, { ascending: false });
  if (error) {
    console.warn(`No se pudo leer ${table}: ${error.message}`);
    return [];
  }

  return (data ?? []) as T[];
}

export async function getAppData(): Promise<AppData> {
  const categories = await selectTable<CategoryRow>("categories");

  if (categories === null) {
    return demoAppData;
  }

  const [
    supplierRows,
    inventoryRows,
    menuProductRows,
    recipeRows,
    recipeItemRows,
    purchaseRows,
    purchaseLineRows,
    productionRows,
    saleRows,
    saleLineRows,
    movementRows
  ] = await Promise.all([
    selectTable<SupplierRow>("suppliers"),
    selectTable<InventoryRow>("inventory_items"),
    selectTable<MenuProductRow>("menu_products"),
    selectTable<RecipeRow>("recipes"),
    selectTable<RecipeItemRow>("recipe_items"),
    selectTable<PurchaseRow>("purchases", "purchased_at"),
    selectTable<PurchaseLineRow>("purchase_lines", "id"),
    selectTable<ProductionBatchRow>("production_batches", "produced_at"),
    selectTable<SaleRow>("sales", "sold_at"),
    selectTable<SaleLineRow>("sale_lines", "id"),
    selectTable<MovementRow>("inventory_movements", "occurred_at")
  ]);

  const categoryMap = new Map((categories ?? []).map((category) => [category.id, category.name]));

  const suppliers: Supplier[] = (supplierRows ?? []).map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    company: textValue(supplier.company),
    contact: textValue(supplier.contact),
    phone: textValue(supplier.phone),
    whatsapp: textValue(supplier.whatsapp),
    email: textValue(supplier.email),
    address: textValue(supplier.address),
    city: textValue(supplier.city),
    socials: textValue(supplier.socials),
    website: textValue(supplier.website),
    notes: textValue(supplier.notes)
  }));

  const supplierMap = byId(suppliers);

  const inventoryItems: InventoryItem[] = (inventoryRows ?? []).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category_id ? categoryMap.get(item.category_id) ?? "" : "",
    subcategory: "",
    kind: item.kind,
    description: textValue(item.description),
    unit: item.unit,
    quantity: numberValue(item.quantity),
    minimumQuantity: numberValue(item.minimum_quantity),
    maximumQuantity: numberValue(item.maximum_quantity),
    purchaseCost: numberValue(item.purchase_cost),
    averageCost: numberValue(item.average_cost),
    referencePrice: numberValue(item.reference_price),
    status: item.status,
    location: textValue(item.location),
    barcode: textValue(item.barcode),
    imageUrl: textValue(item.image_url),
    supplierId: item.supplier_id ?? undefined,
    notes: textValue(item.notes),
    createdAt: item.created_at,
    updatedAt: item.updated_at
  }));

  const inventoryMap = byId(inventoryItems);

  const menuProducts: MenuProduct[] = (menuProductRows ?? []).map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category_id ? categoryMap.get(product.category_id) ?? "" : "",
    price: numberValue(product.price),
    favorite: product.favorite,
    recipeId: "",
    active: product.active
  }));

  const productMap = byId(menuProducts);

  const recipeItemsByRecipe = new Map<string, RecipeItemRow[]>();
  (recipeItemRows ?? []).forEach((item) => {
    recipeItemsByRecipe.set(item.recipe_id, [...(recipeItemsByRecipe.get(item.recipe_id) ?? []), item]);
  });

  const recipes: Recipe[] = (recipeRows ?? []).map((recipe) => ({
    id: recipe.id,
    productId: recipe.product_id,
    productName: productMap.get(recipe.product_id)?.name ?? "Producto sin nombre",
    version: recipe.version,
    isActive: recipe.is_active,
    ingredients: (recipeItemsByRecipe.get(recipe.id) ?? []).map((item) => ({
      inventoryItemId: item.inventory_item_id,
      itemName: inventoryMap.get(item.inventory_item_id)?.name ?? "Articulo sin nombre",
      quantity: numberValue(item.quantity),
      unit: item.unit,
      unitCost: numberValue(item.unit_cost_snapshot)
    }))
  }));

  const activeRecipeByProduct = new Map(recipes.filter((recipe) => recipe.isActive).map((recipe) => [recipe.productId, recipe.id]));
  menuProducts.forEach((product) => {
    product.recipeId = activeRecipeByProduct.get(product.id) ?? "";
  });

  const purchaseLinesByPurchase = new Map<string, PurchaseLineRow[]>();
  (purchaseLineRows ?? []).forEach((line) => {
    purchaseLinesByPurchase.set(line.purchase_id, [...(purchaseLinesByPurchase.get(line.purchase_id) ?? []), line]);
  });

  const purchases: Purchase[] = (purchaseRows ?? []).map((purchase) => ({
    id: purchase.id,
    supplierId: purchase.supplier_id,
    supplierName: supplierMap.get(purchase.supplier_id)?.name ?? "Proveedor sin nombre",
    invoiceNumber: purchase.invoice_number,
    purchasedAt: purchase.purchased_at,
    lines: (purchaseLinesByPurchase.get(purchase.id) ?? []).map((line) => ({
      itemId: line.inventory_item_id,
      itemName: inventoryMap.get(line.inventory_item_id)?.name ?? "Articulo sin nombre",
      quantity: numberValue(line.quantity),
      unitCost: numberValue(line.unit_cost),
      taxRate: numberValue(line.tax_rate),
      discount: numberValue(line.discount)
    }))
  }));

  const productionBatches: ProductionBatch[] = (productionRows ?? []).map((batch) => ({
    id: batch.id,
    productItemId: batch.output_item_id,
    productName: inventoryMap.get(batch.output_item_id)?.name ?? "Producto sin nombre",
    quantityProduced: numberValue(batch.quantity_produced),
    responsible: "",
    totalCost: numberValue(batch.total_cost),
    producedAt: batch.produced_at
  }));

  const saleLinesBySale = new Map<string, SaleLineRow[]>();
  (saleLineRows ?? []).forEach((line) => {
    saleLinesBySale.set(line.sale_id, [...(saleLinesBySale.get(line.sale_id) ?? []), line]);
  });

  const sales = (saleRows ?? []).map((sale) => ({
    id: sale.id,
    invoiceNumber: sale.invoice_number,
    soldAt: sale.sold_at,
    paymentMethod: sale.payment_method,
    discount: numberValue(sale.discount),
    lines: (saleLinesBySale.get(sale.id) ?? []).map((line) => ({
      productId: line.product_id,
      productName: line.product_name_snapshot,
      quantity: numberValue(line.quantity),
      unitPrice: numberValue(line.unit_price),
      unitCost: numberValue(line.unit_cost_snapshot)
    }))
  }));

  const movements: InventoryMovement[] = (movementRows ?? []).map((movement) => ({
    id: movement.id,
    itemId: movement.inventory_item_id,
    itemName: inventoryMap.get(movement.inventory_item_id)?.name ?? "Articulo sin nombre",
    type: movement.type,
    quantity: numberValue(movement.quantity),
    unitCost: numberValue(movement.unit_cost),
    occurredAt: movement.occurred_at,
    reference: movement.reference_table
      ? `${movement.reference_table}${movement.reference_id ? ` ${movement.reference_id}` : ""}`
      : textValue(movement.notes),
    responsible: ""
  }));

  return {
    inventoryItems,
    suppliers,
    recipes,
    menuProducts,
    purchases,
    productionBatches,
    sales,
    movements,
    source: "supabase"
  };
}
