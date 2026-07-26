"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AppData } from "@/lib/app-data";
import type { ModuleKey } from "@/lib/domain";

type DynamicRow = {
  id: string;
};

type CreateRecordDialogProps = {
  module: ModuleKey;
  action: string;
  data: AppData;
};

const inventoryKinds = [
  ["raw_material", "Materia prima"],
  ["packaging", "Empaque"],
  ["prepared", "Producto preparado"],
  ["finished_product", "Producto vendible"],
  ["cleaning", "Limpieza"],
  ["asset", "Activo fijo"],
  ["tool", "Herramienta"]
];

export function CreateRecordDialog({ module, action, data }: CreateRecordDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<DynamicRow[]>([{ id: "line-1" }]);

  const inventoryCategories = useMemo(
    () => Array.from(new Set(data.inventoryItems.map((item) => item.category).filter(Boolean))),
    [data.inventoryItems]
  );
  const menuCategories = useMemo(
    () => Array.from(new Set(data.menuProducts.map((item) => item.category).filter(Boolean))),
    [data.menuProducts]
  );

  function addRow() {
    setRows((current) => [...current, { id: `line-${Date.now()}-${current.length + 1}` }]);
  }

  function removeRow(id: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = buildPayload(module, form, rows);

    try {
      const response = await fetch(`/api/modules/${module}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo guardar.");
      }

      setOpen(false);
      setRows([{ id: "line-1" }]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="primary-action inline" type="button" onClick={() => setOpen(true)}>
        <Plus size={18} />
        {action}
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-label={action}>
            <div className="modal-header">
              <div>
                <h2>{action}</h2>
                <p>{dialogDescription(module)}</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form className="record-form" onSubmit={submitForm}>
              {module === "suppliers" ? <SupplierFields /> : null}
              {module === "inventory" ? (
                <InventoryFields suppliers={data.suppliers} categories={inventoryCategories} />
              ) : null}
              {module === "menu" ? <MenuFields categories={menuCategories} /> : null}
              {module === "recipes" ? (
                <RecipeFields products={data.menuProducts} items={data.inventoryItems} rows={rows} addRow={addRow} removeRow={removeRow} />
              ) : null}
              {module === "purchases" ? (
                <PurchaseFields suppliers={data.suppliers} items={data.inventoryItems} rows={rows} addRow={addRow} removeRow={removeRow} />
              ) : null}
              {module === "production" ? (
                <ProductionFields items={data.inventoryItems} rows={rows} addRow={addRow} removeRow={removeRow} />
              ) : null}
              {module === "movements" ? <MovementFields items={data.inventoryItems} /> : null}
              {module === "audit" ? <UserFields /> : null}

              {message ? <p className="form-message">{message}</p> : null}

              <div className="form-actions">
                <button className="ghost-action" type="button" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button className="primary-action inline" type="submit" disabled={loading}>
                  {loading ? "Guardando" : "Guardar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function buildPayload(module: ModuleKey, form: FormData, rows: DynamicRow[]) {
  const value = (name: string) => String(form.get(name) ?? "");
  const checked = (name: string) => form.get(name) === "on";

  if (module === "suppliers") {
    return Object.fromEntries(form.entries());
  }

  if (module === "inventory") {
    return {
      code: value("code"),
      name: value("name"),
      category: value("category"),
      kind: value("kind"),
      description: value("description"),
      unit: value("unit"),
      quantity: value("quantity"),
      minimumQuantity: value("minimumQuantity"),
      maximumQuantity: value("maximumQuantity"),
      purchaseCost: value("purchaseCost"),
      averageCost: value("averageCost"),
      referencePrice: value("referencePrice"),
      location: value("location"),
      barcode: value("barcode"),
      imageUrl: value("imageUrl"),
      supplierId: value("supplierId"),
      notes: value("notes")
    };
  }

  if (module === "menu") {
    return {
      sku: value("sku"),
      name: value("name"),
      category: value("category"),
      price: value("price"),
      favorite: checked("favorite"),
      active: checked("active")
    };
  }

  if (module === "recipes") {
    return {
      productId: value("productId"),
      version: value("version"),
      isActive: checked("isActive"),
      notes: value("notes"),
      ingredients: rows
        .map((row) => ({
          inventoryItemId: value(`inventoryItemId-${row.id}`),
          quantity: value(`quantity-${row.id}`),
          unit: value(`unit-${row.id}`),
          unitCost: value(`unitCost-${row.id}`)
        }))
        .filter((row) => row.inventoryItemId)
    };
  }

  if (module === "purchases") {
    return {
      supplierId: value("supplierId"),
      invoiceNumber: value("invoiceNumber"),
      purchasedAt: value("purchasedAt"),
      lines: rows
        .map((row) => ({
          inventoryItemId: value(`inventoryItemId-${row.id}`),
          quantity: value(`quantity-${row.id}`),
          unitCost: value(`unitCost-${row.id}`),
          taxRate: value(`taxRate-${row.id}`),
          discount: value(`discount-${row.id}`)
        }))
        .filter((row) => row.inventoryItemId)
    };
  }

  if (module === "production") {
    return {
      outputItemId: value("outputItemId"),
      quantityProduced: value("quantityProduced"),
      producedAt: value("producedAt"),
      notes: value("notes"),
      inputs: rows
        .map((row) => ({
          inventoryItemId: value(`inventoryItemId-${row.id}`),
          quantity: value(`quantity-${row.id}`),
          unitCost: value(`unitCost-${row.id}`)
        }))
        .filter((row) => row.inventoryItemId)
    };
  }

  if (module === "audit") {
    return {
      fullName: value("fullName"),
      email: value("email"),
      password: value("password"),
      role: value("role")
    };
  }

  return {
    inventoryItemId: value("inventoryItemId"),
    quantity: value("quantity"),
    unitCost: value("unitCost"),
    notes: value("notes")
  };
}

function dialogDescription(module: ModuleKey) {
  const descriptions: Partial<Record<ModuleKey, string>> = {
    suppliers: "Crea un proveedor para reutilizarlo en compras e inventario.",
    inventory: "Crea un articulo y registra su cantidad inicial como movimiento.",
    menu: "Crea un producto vendible para la carta.",
    recipes: "Crea una version de receta con ingredientes y empaques.",
    purchases: "Registra una compra y aumenta automaticamente el inventario.",
    production: "Registra un lote producido, descuenta insumos y suma producto final.",
    movements: "Registra un ajuste manual con historial.",
    audit: "Crea un usuario de Supabase Auth y asigna su rol."
  };

  return descriptions[module] ?? "Crea un nuevo registro.";
}

function SupplierFields() {
  return (
    <div className="form-grid">
      <Field name="name" label="Nombre" required />
      <Field name="company" label="Empresa" />
      <Field name="contact" label="Contacto" />
      <Field name="phone" label="Telefono" />
      <Field name="whatsapp" label="WhatsApp" />
      <Field name="email" label="Correo" type="email" />
      <Field name="address" label="Direccion" />
      <Field name="city" label="Ciudad" />
      <Field name="socials" label="Redes sociales" />
      <Field name="website" label="Pagina web" />
      <Textarea name="notes" label="Observaciones" />
    </div>
  );
}

function InventoryFields({
  suppliers,
  categories
}: {
  suppliers: AppData["suppliers"];
  categories: string[];
}) {
  return (
    <div className="form-grid">
      <Field name="code" label="Codigo unico" required />
      <Field name="name" label="Nombre" required />
      <DatalistField name="category" label="Categoria" options={categories} />
      <label className="field">
        <span>Tipo</span>
        <select name="kind" required defaultValue="raw_material">
          {inventoryKinds.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Field name="unit" label="Unidad de medida" placeholder="g, ml, und" required />
      <Field name="quantity" label="Cantidad inicial" type="number" step="0.001" defaultValue="0" />
      <Field name="minimumQuantity" label="Cantidad minima" type="number" step="0.001" defaultValue="0" />
      <Field name="maximumQuantity" label="Cantidad maxima" type="number" step="0.001" defaultValue="0" />
      <Field name="purchaseCost" label="Costo compra" type="number" step="0.01" defaultValue="0" />
      <Field name="averageCost" label="Costo promedio" type="number" step="0.01" defaultValue="0" />
      <Field name="referencePrice" label="Precio referencia" type="number" step="0.01" defaultValue="0" />
      <Field name="location" label="Ubicacion" />
      <Field name="barcode" label="Codigo de barras" />
      <Field name="imageUrl" label="URL imagen" />
      <label className="field">
        <span>Proveedor principal</span>
        <select name="supplierId" defaultValue="">
          <option value="">Sin proveedor</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </label>
      <Textarea name="description" label="Descripcion" />
      <Textarea name="notes" label="Observaciones" />
    </div>
  );
}

function MenuFields({ categories }: { categories: string[] }) {
  return (
    <div className="form-grid">
      <Field name="sku" label="SKU" required />
      <Field name="name" label="Nombre" required />
      <DatalistField name="category" label="Categoria" options={categories} />
      <Field name="price" label="Precio de venta" type="number" step="0.01" defaultValue="0" />
      <label className="check-row">
        <input type="checkbox" name="favorite" />
        <span>Favorito en POS</span>
      </label>
      <label className="check-row">
        <input type="checkbox" name="active" defaultChecked />
        <span>Activo para venta</span>
      </label>
    </div>
  );
}

function RecipeFields({
  products,
  items,
  rows,
  addRow,
  removeRow
}: {
  products: AppData["menuProducts"];
  items: AppData["inventoryItems"];
  rows: DynamicRow[];
  addRow: () => void;
  removeRow: (id: string) => void;
}) {
  return (
    <>
      <div className="form-grid">
        <label className="field">
          <span>Producto de la carta</span>
          <select name="productId" required defaultValue="">
            <option value="">Seleccionar</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <Field name="version" label="Version" type="number" defaultValue="1" />
        <label className="check-row">
          <input type="checkbox" name="isActive" defaultChecked />
          <span>Receta activa</span>
        </label>
        <Textarea name="notes" label="Notas" />
      </div>
      <LineEditor title="Ingredientes y empaques" rows={rows} addRow={addRow} removeRow={removeRow}>
        {(row) => <InventoryLine row={row} items={items} showUnit showCost />}
      </LineEditor>
    </>
  );
}

function PurchaseFields({
  suppliers,
  items,
  rows,
  addRow,
  removeRow
}: {
  suppliers: AppData["suppliers"];
  items: AppData["inventoryItems"];
  rows: DynamicRow[];
  addRow: () => void;
  removeRow: (id: string) => void;
}) {
  return (
    <>
      <div className="form-grid">
        <label className="field">
          <span>Proveedor</span>
          <select name="supplierId" required defaultValue="">
            <option value="">Seleccionar</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>
        <Field name="invoiceNumber" label="Numero de factura" required />
        <Field name="purchasedAt" label="Fecha" type="datetime-local" />
      </div>
      <LineEditor title="Productos comprados" rows={rows} addRow={addRow} removeRow={removeRow}>
        {(row) => <PurchaseLine row={row} items={items} />}
      </LineEditor>
    </>
  );
}

function ProductionFields({
  items,
  rows,
  addRow,
  removeRow
}: {
  items: AppData["inventoryItems"];
  rows: DynamicRow[];
  addRow: () => void;
  removeRow: (id: string) => void;
}) {
  return (
    <>
      <div className="form-grid">
        <label className="field">
          <span>Producto producido</span>
          <select name="outputItemId" required defaultValue="">
            <option value="">Seleccionar</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.unit})
              </option>
            ))}
          </select>
        </label>
        <Field name="quantityProduced" label="Cantidad producida" type="number" step="0.001" required />
        <Field name="producedAt" label="Fecha" type="datetime-local" />
        <Textarea name="notes" label="Notas" />
      </div>
      <LineEditor title="Insumos consumidos" rows={rows} addRow={addRow} removeRow={removeRow}>
        {(row) => <InventoryLine row={row} items={items} showCost />}
      </LineEditor>
    </>
  );
}

function MovementFields({ items }: { items: AppData["inventoryItems"] }) {
  return (
    <div className="form-grid">
      <label className="field">
        <span>Articulo</span>
        <select name="inventoryItemId" required defaultValue="">
          <option value="">Seleccionar</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.quantity} {item.unit})
            </option>
          ))}
        </select>
      </label>
      <Field name="quantity" label="Cantidad (+ entrada / - salida)" type="number" step="0.001" required />
      <Field name="unitCost" label="Costo unitario" type="number" step="0.01" defaultValue="0" />
      <Textarea name="notes" label="Motivo del ajuste" />
    </div>
  );
}

function UserFields() {
  return (
    <div className="form-grid">
      <Field name="fullName" label="Nombre completo" required />
      <Field name="email" label="Correo" type="email" required />
      <Field name="password" label="Contrasena temporal" type="password" required />
      <label className="field">
        <span>Rol</span>
        <select name="role" required defaultValue="employee">
          <option value="employee">Empleado</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
    </div>
  );
}

function LineEditor({
  title,
  rows,
  addRow,
  removeRow,
  children
}: {
  title: string;
  rows: DynamicRow[];
  addRow: () => void;
  removeRow: (id: string) => void;
  children: (row: DynamicRow) => React.ReactNode;
}) {
  return (
    <section className="line-editor">
      <div className="line-editor-header">
        <h3>{title}</h3>
        <button className="ghost-action" type="button" onClick={addRow}>
          <Plus size={16} />
          Agregar linea
        </button>
      </div>
      <div className="line-list">
        {rows.map((row) => (
          <div className="line-row" key={row.id}>
            {children(row)}
            <button className="icon-button" type="button" onClick={() => removeRow(row.id)} aria-label="Eliminar linea">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function InventoryLine({
  row,
  items,
  showUnit = false,
  showCost = false
}: {
  row: DynamicRow;
  items: AppData["inventoryItems"];
  showUnit?: boolean;
  showCost?: boolean;
}) {
  return (
    <>
      <label className="field">
        <span>Articulo</span>
        <select name={`inventoryItemId-${row.id}`} required defaultValue="">
          <option value="">Seleccionar</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.unit})
            </option>
          ))}
        </select>
      </label>
      <Field name={`quantity-${row.id}`} label="Cantidad" type="number" step="0.001" required />
      {showUnit ? <Field name={`unit-${row.id}`} label="Unidad" required /> : null}
      {showCost ? <Field name={`unitCost-${row.id}`} label="Costo unitario" type="number" step="0.01" defaultValue="0" /> : null}
    </>
  );
}

function PurchaseLine({ row, items }: { row: DynamicRow; items: AppData["inventoryItems"] }) {
  return (
    <>
      <InventoryLine row={row} items={items} />
      <Field name={`unitCost-${row.id}`} label="Costo unitario" type="number" step="0.01" defaultValue="0" />
      <Field name={`taxRate-${row.id}`} label="IVA decimal" type="number" step="0.01" defaultValue="0" />
      <Field name={`discount-${row.id}`} label="Descuento" type="number" step="0.01" defaultValue="0" />
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  step,
  required = false,
  defaultValue,
  placeholder
}: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}

function DatalistField({ name, label, options }: { name: string; label: string; options: string[] }) {
  const listId = `${name}-options`;
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} list={listId} />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}

function Textarea({ name, label }: { name: string; label: string }) {
  return (
    <label className="field full-span">
      <span>{label}</span>
      <textarea name={name} rows={3} />
    </label>
  );
}
