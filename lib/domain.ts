export type UserRole = "admin" | "employee";

export type InventoryKind =
  | "raw_material"
  | "packaging"
  | "prepared"
  | "finished_product"
  | "cleaning"
  | "asset"
  | "tool";

export type InventoryStatus = "active" | "inactive" | "low_stock" | "out_of_stock";

export type InventoryItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string;
  kind: InventoryKind;
  description: string;
  unit: string;
  quantity: number;
  minimumQuantity: number;
  maximumQuantity: number;
  purchaseCost: number;
  averageCost: number;
  referencePrice: number;
  status: InventoryStatus;
  location: string;
  barcode?: string;
  imageUrl?: string;
  supplierId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  company: string;
  contact: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  socials: string;
  website: string;
  notes: string;
};

export type RecipeIngredient = {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
};

export type Recipe = {
  id: string;
  productId: string;
  productName: string;
  version: number;
  isActive: boolean;
  ingredients: RecipeIngredient[];
};

export type MenuProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  favorite: boolean;
  recipeId: string;
  active: boolean;
};

export type PurchaseLine = {
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  discount: number;
};

export type Purchase = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  purchasedAt: string;
  lines: PurchaseLine[];
};

export type ProductionBatch = {
  id: string;
  productItemId: string;
  productName: string;
  quantityProduced: number;
  responsible: string;
  totalCost: number;
  producedAt: string;
};

export type PaymentMethod = "cash" | "card" | "transfer" | "mixed";

export type SaleLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export type Sale = {
  id: string;
  invoiceNumber: string;
  soldAt: string;
  paymentMethod: PaymentMethod;
  discount: number;
  notes?: string;
  lines: SaleLine[];
};

export type InventoryMovementType =
  | "purchase"
  | "sale"
  | "production_input"
  | "production_output"
  | "manual_adjustment";

export type InventoryMovement = {
  id: string;
  itemId: string;
  itemName: string;
  type: InventoryMovementType;
  quantity: number;
  unitCost: number;
  occurredAt: string;
  reference: string;
  responsible: string;
};

export type ModuleKey =
  | "dashboard"
  | "pos"
  | "inventory"
  | "suppliers"
  | "purchases"
  | "production"
  | "recipes"
  | "menu"
  | "movements"
  | "alerts"
  | "costs"
  | "reports"
  | "reconstruction"
  | "audit";

export type PeriodPreset =
  | "last_24_hours"
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "year"
  | "custom";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}

export function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

export function recipeCost(recipe: Recipe) {
  return sumBy(recipe.ingredients, (ingredient) => ingredient.quantity * ingredient.unitCost);
}

export function saleGrossTotal(sale: Sale) {
  return sumBy(sale.lines, (line) => line.quantity * line.unitPrice) - sale.discount;
}

export function saleCostTotal(sale: Sale) {
  return sumBy(sale.lines, (line) => line.quantity * line.unitCost);
}
