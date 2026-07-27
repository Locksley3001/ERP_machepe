"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ActionFeedbackOverlay, feedbackDuration } from "@/components/action-feedback-overlay";
import type { AppData } from "@/lib/app-data";
import type { ModuleKey } from "@/lib/domain";
import { formatMoneyInput, formatMoneyTyping, formatNumber, parseLocalizedNumber } from "@/lib/number-format";

type DynamicRow = {
  id: string;
};

type CreateRecordDialogProps = {
  module: ModuleKey;
  action: string;
  data: AppData;
};

type FeedbackStatus = "success" | "error";

function waitForFeedback() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, feedbackDuration);
  });
}

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
  const [feedback, setFeedback] = useState<{ status: FeedbackStatus; message: string } | null>(null);
  const [formWasValidated, setFormWasValidated] = useState(false);
  const submitInFlight = useRef(false);

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
    setFormWasValidated(true);
    if (submitInFlight.current) {
      return;
    }

    submitInFlight.current = true;
    setLoading(true);
    setMessage("");
    setFeedback(null);

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

      const successMessage = "Registro guardado.";
      setFeedback({ status: "success", message: successMessage });
      await waitForFeedback();
      setFeedback(null);
      setOpen(false);
      setFormWasValidated(false);
      setRows([{ id: "line-1" }]);
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo guardar.";
      setMessage(errorMessage);
      setFeedback({ status: "error", message: errorMessage });
      await waitForFeedback();
      setFeedback(null);
    } finally {
      submitInFlight.current = false;
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
          {feedback ? <ActionFeedbackOverlay status={feedback.status} message={feedback.message} /> : null}
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

            <form
              className={formWasValidated ? "record-form was-validated" : "record-form"}
              onSubmit={submitForm}
              onInvalidCapture={() => setFormWasValidated(true)}
              onInput={(event) => {
                if (formWasValidated && event.currentTarget.checkValidity()) {
                  setFormWasValidated(false);
                }
              }}
              onChange={(event) => {
                if (formWasValidated && event.currentTarget.checkValidity()) {
                  setFormWasValidated(false);
                }
              }}
            >
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
  const [quantity, setQuantity] = useState("0");
  const [purchaseCost, setPurchaseCost] = useState("0");
  const [unit, setUnit] = useState("");
  const unitCost = parseLocalizedNumber(quantity) > 0 ? parseLocalizedNumber(purchaseCost) / parseLocalizedNumber(quantity) : 0;

  return (
    <div className="form-grid">
      <Field name="code" label="Codigo unico" required />
      <Field name="name" label="Nombre" required />
      <DatalistField name="category" label="Categoria" options={categories} />
      <label className="field">
        <span>Tipo de producto</span>
        <select name="kind" required defaultValue="raw_material">
          {inventoryKinds.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Unidad base de inventario</span>
        <input name="unit" placeholder="g, ml, und" required value={unit} onChange={(event) => setUnit(event.target.value)} />
      </label>
      <NumberField name="quantity" label="Cantidad inicial en unidad base" value={quantity} onChange={setQuantity} />
      <NumberField name="minimumQuantity" label="Cantidad minima permitida" defaultValue="0" />
      <NumberField name="maximumQuantity" label="Cantidad maxima recomendada" defaultValue="0" />
      <MoneyField name="purchaseCost" label="Costo total de compra" value={purchaseCost} onChange={setPurchaseCost} />
      <input type="hidden" name="averageCost" value={unitCost} />
      <ReadOnlyMetric
        label="Costo automatico por unidad base"
        value={unitCost ? `${formatNumber(unitCost, 2)} por ${unit || "unidad"}` : "Pendiente"}
      />
      <MoneyField name="referencePrice" label="Precio de referencia opcional" defaultValue="0" />
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
      <Field name="name" label="Nombre del producto en carta" required />
      <DatalistField name="category" label="Categoria de carta" options={categories} />
      <MoneyField name="price" label="Precio de venta al cliente" defaultValue="0" />
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
      <LineEditor title="Ingredientes y empaques" rows={rows} addRow={addRow} removeRow={removeRow} rowClassName="recipe-line-row">
        {(row) => <RecipeIngredientLine row={row} items={items} />}
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
      <LineEditor title="Productos comprados" rows={rows} addRow={addRow} removeRow={removeRow} rowClassName="purchase-line-row">
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
      <LineEditor title="Insumos consumidos" rows={rows} addRow={addRow} removeRow={removeRow} rowClassName="production-line-row">
        {(row) => <InventoryLine row={row} items={items} autoCost />}
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
      <NumberField name="quantity" label="Cantidad del ajuste (+ entrada / - salida)" required />
      <MoneyField name="unitCost" label="Costo unitario del ajuste" defaultValue="0" />
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
  rowClassName,
  children
}: {
  title: string;
  rows: DynamicRow[];
  addRow: () => void;
  removeRow: (id: string) => void;
  rowClassName?: string;
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
          <div className={rowClassName ? `line-row ${rowClassName}` : "line-row"} key={row.id}>
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
  autoCost = false
}: {
  row: DynamicRow;
  items: AppData["inventoryItems"];
  autoCost?: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selectedItem = items.find((item) => item.id === selectedId);
  const cost = selectedItem?.averageCost ?? 0;

  return (
    <>
      <label className="field">
        <span>Articulo</span>
        <select name={`inventoryItemId-${row.id}`} required value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          <option value="">Seleccionar</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.unit})
            </option>
          ))}
        </select>
      </label>
      <NumberField name={`quantity-${row.id}`} label={`Cantidad${selectedItem ? ` en ${selectedItem.unit}` : ""}`} required />
      {autoCost ? (
        <>
          <input type="hidden" name={`unitCost-${row.id}`} value={cost} />
          <ReadOnlyMetric label="Costo unitario automatico" value={selectedItem ? `${formatNumber(cost, 2)} / ${selectedItem.unit}` : "Selecciona articulo"} />
        </>
      ) : null}
    </>
  );
}

function PurchaseLine({ row, items }: { row: DynamicRow; items: AppData["inventoryItems"] }) {
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lineTotal, setLineTotal] = useState("0");
  const selectedItem = items.find((item) => item.id === selectedId);
  const unitCost = parseLocalizedNumber(quantity) > 0 ? parseLocalizedNumber(lineTotal) / parseLocalizedNumber(quantity) : 0;

  return (
    <>
      <label className="field">
        <span>Articulo</span>
        <select name={`inventoryItemId-${row.id}`} required value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          <option value="">Seleccionar</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.unit})
            </option>
          ))}
        </select>
      </label>
      <NumberField
        name={`quantity-${row.id}`}
        label={`Cantidad${selectedItem ? ` en ${selectedItem.unit}` : ""}`}
        value={quantity}
        onChange={setQuantity}
        required
      />
      <MoneyField name={`lineTotal-${row.id}`} label="Costo total comprado" value={lineTotal} onChange={setLineTotal} />
      <input type="hidden" name={`unitCost-${row.id}`} value={unitCost} />
      <ReadOnlyMetric
        label="Costo unitario automatico"
        value={unitCost && selectedItem ? `${formatNumber(unitCost, 2)} / ${selectedItem.unit}` : "Ingresa cantidad y total"}
      />
      <NumberField name={`taxRate-${row.id}`} label="IVA en decimal (0,19)" defaultValue="0" />
      <MoneyField name={`discount-${row.id}`} label="Descuento de la linea" defaultValue="0" />
    </>
  );
}

function RecipeIngredientLine({ row, items }: { row: DynamicRow; items: AppData["inventoryItems"] }) {
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const selectedItem = items.find((item) => item.id === selectedId);
  const unitCost = selectedItem?.averageCost ?? 0;
  const totalCost = parseLocalizedNumber(amount) * unitCost;

  return (
    <>
      <label className="field">
        <span>Ingrediente o empaque</span>
        <select name={`inventoryItemId-${row.id}`} required value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          <option value="">Seleccionar</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.unit})
            </option>
          ))}
        </select>
      </label>
      <NumberField
        name={`quantity-${row.id}`}
        label={selectedItem ? `Cantidad usada en ${selectedItem.unit}` : "Cantidad usada"}
        value={amount}
        onChange={setAmount}
        required
      />
      <input type="hidden" name={`unit-${row.id}`} value={selectedItem?.unit ?? ""} />
      <input type="hidden" name={`unitCost-${row.id}`} value={unitCost} />
      <ReadOnlyMetric
        label="Costo automatico"
        value={selectedItem ? `${formatNumber(unitCost, 2)} / ${selectedItem.unit} = ${formatNumber(totalCost, 0)}` : "Selecciona articulo"}
      />
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

function NumberField({
  name,
  label,
  required = false,
  defaultValue,
  value,
  onChange
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const hasManualValue = useRef(false);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    if (!hasManualValue.current && event.currentTarget.value === "0") {
      event.currentTarget.value = "";
      onChange?.("");
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    hasManualValue.current = true;
    const formatted = formatMoneyTyping(event.target.value);
    event.target.value = formatted;
    onChange?.(formatted);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseLocalizedNumber(event.target.value);
    const formatted = parsed ? formatNumber(parsed, 3) : "";
    event.target.value = formatted;
    onChange?.(formatted);
  };

  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        inputMode="decimal"
        required={required}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </label>
  );
}

function MoneyField({
  name,
  label,
  required = false,
  defaultValue,
  value,
  onChange
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const hasManualValue = useRef(false);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    if (!hasManualValue.current && event.currentTarget.value === "0") {
      event.currentTarget.value = "";
      onChange?.("");
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    hasManualValue.current = true;
    onChange?.(event.target.value);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const formatted = formatMoneyInput(event.target.value);
    event.target.value = formatted;
    onChange?.(formatted);
  };

  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        inputMode="numeric"
        required={required}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </label>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="calculated-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
