import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { CreateRecordDialog } from "@/components/create-record-dialog";
import { DataTable } from "@/components/data-table";
import { PermissionsManager } from "@/components/permissions-manager";
import { PosTerminal } from "@/components/pos-terminal";
import { ReportExporter } from "@/components/report-exporter";
import { formatCurrency, recipeCost, saleGrossTotal, type ModuleKey } from "@/lib/domain";
import { findNavigationItem, navigationItems } from "@/lib/navigation";
import { getPermissionAdminData } from "@/lib/permissions-admin";
import { periodDays, reconstructDay, resolvePeriod } from "@/lib/reports";
import type { AppData } from "@/lib/app-data";

export async function ModuleWorkspace({ module, data }: { module: string; data: AppData }) {
  const item = findNavigationItem(module);
  const { inventoryItems, menuProducts, movements, productionBatches, purchases, recipes, suppliers } = data;

  if (!item || item.key === "dashboard") {
    notFound();
  }

  if (item.key === "pos") {
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} />
        <PosTerminal products={menuProducts} />
      </>
    );
  }

  if (item.key === "inventory") {
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} module={item.key} action="Nuevo articulo" data={data} />
        <DataTable
          rows={inventoryItems}
          columns={[
            { key: "code", header: "Codigo" },
            { key: "name", header: "Articulo" },
            { key: "category", header: "Categoria" },
            { key: "quantity", header: "Cantidad", render: (row) => `${row.quantity} ${row.unit}` },
            { key: "minimumQuantity", header: "Minimo" },
            { key: "averageCost", header: "Costo prom.", render: (row) => formatCurrency(row.averageCost) },
            { key: "status", header: "Estado", render: (row) => <StatusBadge value={row.status} /> }
          ]}
        />
      </>
    );
  }

  if (item.key === "suppliers") {
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} module={item.key} action="Nuevo proveedor" data={data} />
        <DataTable
          rows={suppliers}
          columns={[
            { key: "name", header: "Nombre" },
            { key: "company", header: "Empresa" },
            { key: "contact", header: "Contacto" },
            { key: "whatsapp", header: "WhatsApp" },
            { key: "email", header: "Correo" },
            { key: "city", header: "Ciudad" }
          ]}
        />
      </>
    );
  }

  if (item.key === "purchases") {
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} module={item.key} action="Registrar compra" data={data} />
        <DataTable
          rows={purchases.map((purchase) => ({
            ...purchase,
            total: purchase.lines.reduce((total, line) => total + line.quantity * line.unitCost - line.discount, 0)
          }))}
          columns={[
            { key: "invoiceNumber", header: "Factura" },
            { key: "supplierName", header: "Proveedor" },
            { key: "purchasedAt", header: "Fecha", render: (row) => new Date(row.purchasedAt).toLocaleString("es-CO") },
            { key: "lines", header: "Items", render: (row) => row.lines.length },
            { key: "total", header: "Total", render: (row) => formatCurrency(row.total) }
          ]}
        />
      </>
    );
  }

  if (item.key === "production") {
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} module={item.key} action="Nuevo lote" data={data} />
        <DataTable
          rows={productionBatches}
          columns={[
            { key: "productName", header: "Producto preparado" },
            { key: "quantityProduced", header: "Cantidad" },
            { key: "responsible", header: "Responsable" },
            { key: "totalCost", header: "Costo", render: (row) => formatCurrency(row.totalCost) },
            { key: "producedAt", header: "Fecha", render: (row) => new Date(row.producedAt).toLocaleString("es-CO") }
          ]}
        />
      </>
    );
  }

  if (item.key === "recipes") {
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} module={item.key} action="Nueva receta" data={data} />
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <section className="panel" key={recipe.id}>
              <div className="split-heading">
                <div>
                  <h2>{recipe.productName}</h2>
                  <p>Version {recipe.version} activa</p>
                </div>
                <strong>{formatCurrency(recipeCost(recipe))}</strong>
              </div>
              <ul className="ingredient-list">
                {recipe.ingredients.map((ingredient) => (
                  <li key={`${recipe.id}-${ingredient.inventoryItemId}`}>
                    <span>{ingredient.itemName}</span>
                    <small>
                      {ingredient.quantity} {ingredient.unit} x {formatCurrency(ingredient.unitCost)}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </>
    );
  }

  if (item.key === "menu") {
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} module={item.key} action="Nuevo producto" data={data} />
        <DataTable
          rows={menuProducts}
          columns={[
            { key: "sku", header: "SKU" },
            { key: "name", header: "Producto" },
            { key: "category", header: "Categoria" },
            { key: "price", header: "Precio", render: (row) => formatCurrency(row.price) },
            { key: "favorite", header: "Favorito", render: (row) => (row.favorite ? "Si" : "No") },
            { key: "active", header: "Activo", render: (row) => (row.active ? "Si" : "No") }
          ]}
        />
      </>
    );
  }

  if (item.key === "movements") {
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} module={item.key} action="Ajuste manual" data={data} />
        <DataTable
          rows={movements}
          columns={[
            { key: "itemName", header: "Articulo" },
            { key: "type", header: "Tipo" },
            { key: "quantity", header: "Cantidad" },
            { key: "reference", header: "Referencia" },
            { key: "responsible", header: "Responsable" },
            { key: "occurredAt", header: "Fecha", render: (row) => new Date(row.occurredAt).toLocaleString("es-CO") }
          ]}
        />
      </>
    );
  }

  if (item.key === "alerts") {
    const alerts = inventoryItems.filter((inventoryItem) => inventoryItem.quantity <= inventoryItem.minimumQuantity);
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} />
        <div className="alert-list">
          {alerts.map((alert) => (
            <section className="alert-row" key={alert.id}>
              <AlertTriangle size={20} />
              <div>
                <strong>{alert.name}</strong>
                <span>
                  Stock actual {alert.quantity} {alert.unit}. Minimo definido {alert.minimumQuantity} {alert.unit}.
                </span>
              </div>
            </section>
          ))}
        </div>
      </>
    );
  }

  if (item.key === "costs") {
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} />
        <DataTable
          rows={recipes.map((recipe) => {
            const product = menuProducts.find((menuProduct) => menuProduct.id === recipe.productId);
            const cost = recipeCost(recipe);
            const price = product?.price ?? 0;
            return {
              id: recipe.id,
              productName: recipe.productName,
              cost,
              price,
              grossProfit: price - cost,
              margin: price ? ((price - cost) / price) * 100 : 0
            };
          })}
          columns={[
            { key: "productName", header: "Producto" },
            { key: "cost", header: "Costo", render: (row) => formatCurrency(row.cost) },
            { key: "price", header: "Precio", render: (row) => formatCurrency(row.price) },
            { key: "grossProfit", header: "Utilidad bruta", render: (row) => formatCurrency(row.grossProfit) },
            { key: "margin", header: "Margen", render: (row) => `${row.margin.toFixed(1)}%` }
          ]}
        />
      </>
    );
  }

  if (item.key === "reports") {
    const { start, end } = resolvePeriod("week");
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} />
        <section className="panel">
          <h2>Exportacion profesional</h2>
          <p>
            Los periodos semanales, mensuales y anuales se exportan completos aunque todavia no hayan terminado.
          </p>
          <ReportExporter />
        </section>
        <DataTable
          rows={periodDays(start, end)}
          columns={[
            { key: "label", header: "Dia" },
            { key: "date", header: "Fecha" },
            { key: "isFuture", header: "Estado", render: (row) => (row.isFuture ? "Pendiente" : "Disponible") }
          ]}
        />
      </>
    );
  }

  if (item.key === "reconstruction") {
    const reconstruction = reconstructDay(data, new Date().toISOString().slice(0, 10));
    return (
      <>
        <ModuleHeader title={item.label} description={item.description} />
        <div className="kpi-grid">
          <Kpi label="Ventas del dia" value={formatCurrency(reconstruction.summary.revenue)} />
          <Kpi label="Facturas" value={String(reconstruction.sales.length)} />
          <Kpi label="Movimientos" value={String(reconstruction.movements.length)} />
          <Kpi label="Utilidad bruta" value={formatCurrency(reconstruction.summary.grossProfit)} />
        </div>
        <DataTable
          rows={reconstruction.sales.map((sale) => ({ ...sale, total: saleGrossTotal(sale) }))}
          columns={[
            { key: "invoiceNumber", header: "Factura" },
            { key: "paymentMethod", header: "Pago" },
            { key: "total", header: "Total", render: (row) => formatCurrency(row.total) },
            { key: "soldAt", header: "Fecha", render: (row) => new Date(row.soldAt).toLocaleString("es-CO") }
          ]}
        />
      </>
    );
  }

  const permissionData = await getPermissionAdminData();
  const permissionModules = navigationItems.map((navigationItem) => ({
    key: navigationItem.key,
    label: navigationItem.label,
    description: navigationItem.description
  }));

  return (
    <>
      <ModuleHeader title={item.label} description={item.description} module={item.key} action="Nuevo usuario" data={data} />
      <section className="panel">
        <h2>Control de acceso y auditoria</h2>
        <p>Administra los modulos visibles y permitidos para cada perfil de empleado.</p>
        {permissionData.authorized ? (
          <PermissionsManager profiles={permissionData.profiles} permissions={permissionData.permissions} modules={permissionModules} />
        ) : (
          <p className="form-message">Solo un administrador activo puede editar permisos.</p>
        )}
      </section>
    </>
  );
}

function ModuleHeader({
  title,
  description,
  action,
  module,
  data
}: {
  title: string;
  description: string;
  action?: string;
  module?: ModuleKey;
  data?: AppData;
}) {
  return (
    <div className="module-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && module && data ? <CreateRecordDialog module={module} action={action} data={data} /> : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <section className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`status ${value}`}>{value.replaceAll("_", " ")}</span>;
}
