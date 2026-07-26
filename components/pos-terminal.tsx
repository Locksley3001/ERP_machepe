"use client";

import { Minus, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatCurrency, type MenuProduct, type PaymentMethod } from "@/lib/domain";

type CartLine = {
  product: MenuProduct;
  quantity: number;
};

export function PosTerminal({ products }: { products: MenuProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const categories = ["Todas", ...Array.from(new Set(products.map((product) => product.category)))];

  const filteredProducts = products.filter((product) => {
    const matchesCategory = category === "Todas" || product.category === category;
    const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase()) || product.sku.toLowerCase().includes(query.toLowerCase());
    return product.active && matchesCategory && matchesQuery;
  });

  const subtotal = useMemo(
    () => cart.reduce((total, line) => total + line.quantity * line.product.price, 0),
    [cart]
  );

  function addProduct(product: MenuProduct) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, amount: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId ? { ...line, quantity: Math.max(0, line.quantity + amount) } : line
        )
        .filter((line) => line.quantity > 0)
    );
  }

  async function finalizeSale() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/modules/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          discount,
          notes,
          lines: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity }))
        })
      });
      const result = (await response.json()) as { error?: string; invoiceNumber?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo finalizar la venta.");
      }

      setCart([]);
      setDiscount(0);
      setNotes("");
      setMessage(`Venta guardada: ${result.invoiceNumber ?? "factura creada"}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo finalizar la venta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pos-layout">
      <section className="pos-catalog">
        <div className="module-toolbar">
          <div className="global-search compact">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto" />
          </div>
          <div className="segmented" role="tablist" aria-label="Categorias">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={item === category ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <button key={product.id} type="button" className="product-tile" onClick={() => addProduct(product)}>
              <span>{product.category}</span>
              <strong>{product.name}</strong>
              <small>{product.sku}</small>
              <em>{formatCurrency(product.price)}</em>
            </button>
          ))}
        </div>
      </section>

      <aside className="cart-panel">
        <div className="cart-header">
          <h2>Venta actual</h2>
          <button className="icon-button" type="button" onClick={() => setCart([])} aria-label="Vaciar carrito" title="Vaciar carrito">
            <Trash2 size={18} />
          </button>
        </div>

        <div className="cart-lines">
          {cart.map((line) => (
            <div key={line.product.id} className="cart-line">
              <div>
                <strong>{line.product.name}</strong>
                <small>{formatCurrency(line.product.price)}</small>
              </div>
              <div className="qty-control">
                <button type="button" onClick={() => changeQuantity(line.product.id, -1)} aria-label="Restar">
                  <Minus size={14} />
                </button>
                <span>{line.quantity}</span>
                <button type="button" onClick={() => changeQuantity(line.product.id, 1)} aria-label="Sumar">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
          {!cart.length ? <p className="muted">Selecciona productos para iniciar la venta.</p> : null}
        </div>

        <label className="field">
          <span>Descuento</span>
          <input
            type="number"
            min="0"
            value={discount}
            onChange={(event) => setDiscount(Number(event.target.value))}
          />
        </label>

        <div className="totals">
          <div>
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatCurrency(Math.max(0, subtotal - discount))}</strong>
          </div>
        </div>

        <div className="payment-grid">
          {[
            ["cash", "Efectivo"],
            ["card", "Tarjeta"],
            ["transfer", "Transferencia"],
            ["mixed", "Mixto"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={paymentMethod === value ? "active" : ""}
              onClick={() => setPaymentMethod(value as PaymentMethod)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Observaciones</span>
          <textarea value={notes} rows={3} onChange={(event) => setNotes(event.target.value)} />
        </label>
        {message ? <p className="form-message">{message}</p> : null}

        <button className="primary-action" type="button" disabled={!cart.length || loading} onClick={finalizeSale}>
          <ReceiptText size={18} />
          {loading ? "Guardando venta" : "Finalizar venta"}
        </button>
      </aside>
    </div>
  );
}
