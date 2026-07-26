import type {
  InventoryItem,
  InventoryMovement,
  MenuProduct,
  ProductionBatch,
  Purchase,
  Recipe,
  Sale,
  Supplier
} from "@/lib/domain";

const now = new Date();
const iso = (daysAgo: number, hour = 10) => {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const suppliers: Supplier[] = [
  {
    id: "sup-1",
    name: "Distribuidora Seoul",
    company: "Seoul Foods SAS",
    contact: "Laura Kim",
    phone: "3001112233",
    whatsapp: "3001112233",
    email: "compras@seoulfoods.co",
    address: "Calle 80 # 20-15",
    city: "Bogota",
    socials: "@seoulfoods",
    website: "https://example.com",
    notes: "Proveedor principal de tapioca, te y polvos saborizados."
  },
  {
    id: "sup-2",
    name: "Empaques Andinos",
    company: "Empaques Andinos",
    contact: "Carlos Rojas",
    phone: "3012223344",
    whatsapp: "3012223344",
    email: "ventas@empaquesandinos.co",
    address: "Av. Americas # 44-10",
    city: "Bogota",
    socials: "@empaquesandinos",
    website: "https://example.com",
    notes: "Vasos, tapas, pitillos y empaques para delivery."
  }
];

export const inventoryItems: InventoryItem[] = [
  {
    id: "inv-1",
    code: "MP-TAP-001",
    name: "Tapioca perla negra",
    category: "Materia prima",
    subcategory: "Toppings",
    kind: "raw_material",
    description: "Tapioca seca para coccion diaria.",
    unit: "g",
    quantity: 7200,
    minimumQuantity: 3000,
    maximumQuantity: 20000,
    purchaseCost: 18,
    averageCost: 18,
    referencePrice: 0,
    status: "active",
    location: "Bodega seca",
    supplierId: "sup-1",
    notes: "Rotar por fecha de ingreso.",
    createdAt: iso(30),
    updatedAt: iso(1)
  },
  {
    id: "inv-2",
    code: "MP-TAR-001",
    name: "Polvo sabor taro",
    category: "Materia prima",
    subcategory: "Polvos",
    kind: "raw_material",
    description: "Base en polvo para bubble tea taro.",
    unit: "g",
    quantity: 1800,
    minimumQuantity: 2500,
    maximumQuantity: 12000,
    purchaseCost: 42,
    averageCost: 43,
    referencePrice: 0,
    status: "low_stock",
    location: "Bodega seca",
    supplierId: "sup-1",
    createdAt: iso(35),
    updatedAt: iso(0)
  },
  {
    id: "inv-3",
    code: "EMP-VAS-500",
    name: "Vaso PET 500 ml",
    category: "Empaque",
    subcategory: "Vasos",
    kind: "packaging",
    description: "Vaso transparente para bebida fria.",
    unit: "und",
    quantity: 140,
    minimumQuantity: 200,
    maximumQuantity: 3000,
    purchaseCost: 270,
    averageCost: 270,
    referencePrice: 0,
    status: "low_stock",
    location: "Estanteria empaques",
    supplierId: "sup-2",
    createdAt: iso(25),
    updatedAt: iso(0)
  },
  {
    id: "inv-4",
    code: "PROD-TAP-COC",
    name: "Tapioca cocida",
    category: "Produccion",
    subcategory: "Toppings preparados",
    kind: "prepared",
    description: "Tapioca lista para servicio.",
    unit: "g",
    quantity: 950,
    minimumQuantity: 800,
    maximumQuantity: 3500,
    purchaseCost: 0,
    averageCost: 24,
    referencePrice: 0,
    status: "active",
    location: "Linea fria",
    createdAt: iso(5),
    updatedAt: iso(0)
  }
];

export const recipes: Recipe[] = [
  {
    id: "rec-1",
    productId: "prod-1",
    productName: "Bubble Tea Taro",
    version: 3,
    isActive: true,
    ingredients: [
      { inventoryItemId: "inv-2", itemName: "Polvo sabor taro", quantity: 20, unit: "g", unitCost: 43 },
      { inventoryItemId: "inv-4", itemName: "Tapioca cocida", quantity: 90, unit: "g", unitCost: 24 },
      { inventoryItemId: "inv-3", itemName: "Vaso PET 500 ml", quantity: 1, unit: "und", unitCost: 270 }
    ]
  },
  {
    id: "rec-2",
    productId: "prod-2",
    productName: "Mochi fresa",
    version: 1,
    isActive: true,
    ingredients: [
      { inventoryItemId: "inv-3", itemName: "Vaso PET 500 ml", quantity: 0.2, unit: "und", unitCost: 270 }
    ]
  }
];

export const menuProducts: MenuProduct[] = [
  {
    id: "prod-1",
    sku: "BT-TARO-500",
    name: "Bubble Tea Taro",
    category: "Bubble Tea",
    price: 14500,
    favorite: true,
    recipeId: "rec-1",
    active: true
  },
  {
    id: "prod-2",
    sku: "MO-FRESA",
    name: "Mochi fresa",
    category: "Mochis",
    price: 6500,
    favorite: true,
    recipeId: "rec-2",
    active: true
  },
  {
    id: "prod-3",
    sku: "CD-QUESO",
    name: "Corn Dog queso",
    category: "Corn Dogs",
    price: 11000,
    favorite: false,
    recipeId: "rec-3",
    active: true
  }
];

export const purchases: Purchase[] = [
  {
    id: "pur-1",
    supplierId: "sup-1",
    supplierName: "Distribuidora Seoul",
    invoiceNumber: "SF-1019",
    purchasedAt: iso(2, 9),
    lines: [
      { itemId: "inv-1", itemName: "Tapioca perla negra", quantity: 5000, unitCost: 18, taxRate: 0.19, discount: 0 },
      { itemId: "inv-2", itemName: "Polvo sabor taro", quantity: 1000, unitCost: 42, taxRate: 0.19, discount: 0 }
    ]
  }
];

export const productionBatches: ProductionBatch[] = [
  {
    id: "bat-1",
    productItemId: "inv-4",
    productName: "Tapioca cocida",
    quantityProduced: 1800,
    responsible: "Administrador",
    totalCost: 43200,
    producedAt: iso(0, 8)
  }
];

export const sales: Sale[] = [
  {
    id: "sale-1",
    invoiceNumber: "F-000218",
    soldAt: iso(0, 11),
    paymentMethod: "card",
    discount: 0,
    lines: [
      { productId: "prod-1", productName: "Bubble Tea Taro", quantity: 4, unitPrice: 14500, unitCost: 3290 },
      { productId: "prod-2", productName: "Mochi fresa", quantity: 2, unitPrice: 6500, unitCost: 1750 }
    ]
  },
  {
    id: "sale-2",
    invoiceNumber: "F-000219",
    soldAt: iso(1, 18),
    paymentMethod: "cash",
    discount: 1000,
    lines: [{ productId: "prod-1", productName: "Bubble Tea Taro", quantity: 3, unitPrice: 14500, unitCost: 3290 }]
  }
];

export const movements: InventoryMovement[] = [
  {
    id: "mov-1",
    itemId: "inv-1",
    itemName: "Tapioca perla negra",
    type: "purchase",
    quantity: 5000,
    unitCost: 18,
    occurredAt: iso(2, 9),
    reference: "Compra SF-1019",
    responsible: "Administrador"
  },
  {
    id: "mov-2",
    itemId: "inv-4",
    itemName: "Tapioca cocida",
    type: "production_output",
    quantity: 1800,
    unitCost: 24,
    occurredAt: iso(0, 8),
    reference: "Lote bat-1",
    responsible: "Administrador"
  },
  {
    id: "mov-3",
    itemId: "inv-4",
    itemName: "Tapioca cocida",
    type: "sale",
    quantity: -360,
    unitCost: 24,
    occurredAt: iso(0, 11),
    reference: "Factura F-000218",
    responsible: "POS"
  }
];
