"use client";

import { Minus, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ActionFeedbackOverlay, feedbackDuration } from "@/components/action-feedback-overlay";
import { formatCurrency, type MenuProduct, type PaymentMethod } from "@/lib/domain";
import { formatNumber, parseLocalizedNumber } from "@/lib/number-format";

type CartLine = {
  product: MenuProduct;
  quantity: number;
};

type FeedbackStatus = "success" | "error";

function waitForFeedback() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, feedbackDuration);
  });
}

export function PosTerminal({ products }: { products: MenuProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountPercent, setDiscountPercent] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ status: FeedbackStatus; message: string } | null>(null);
  const discountTouched = useRef(false);
  const categories = ["Todas", ...Array.from(new Set(products.map((product) => product.category)))];
  const discountRate = Math.min(100, Math.max(0, parseLocalizedNumber(discountPercent)));

  const filteredProducts = products.filter((product) => {
    const matchesCategory = category === "Todas" || product.category === category;
    const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase()) || product.sku.toLowerCase().includes(query.toLowerCase());
    return product.active && matchesCategory && matchesQuery;
  });

  const subtotal = useMemo(
    () => cart.reduce((total, line) => total + line.quantity * line.product.price, 0),
    [cart]
  );
  const discountValue = Math.round(subtotal * (discountRate / 100));
  const total = Math.max(0, subtotal - discountValue);

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
          discount: discountValue,
          notes,
          lines: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity }))
        })
      });
      const result = (await response.json()) as { error?: string; invoiceNumber?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo finalizar la venta.");
      }

      const successMessage = `Venta guardada: ${result.invoiceNumber ?? "factura creada"}.`;
      setFeedback({ status: "success", message: successMessage });
      await waitForFeedback();
      setFeedback(null);
      setCart([]);
      setDiscountPercent("0");
      discountTouched.current = false;
      setNotes("");
      setMessage(successMessage);
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo finalizar la venta.";
      setMessage(errorMessage);
      setFeedback({ status: "error", message: errorMessage });
      await waitForFeedback();
      setFeedback(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pos-layout">
      {feedback ? <ActionFeedbackOverlay status={feedback.status} message={feedback.message} /> : null}
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
          <span>Descuento (%)</span>
          <input
            inputMode="decimal"
            value={discountPercent}
            onFocus={(event) => {
              if (!discountTouched.current && event.currentTarget.value === "0") {
                setDiscountPercent("");
              }
            }}
            onChange={(event) => {
              discountTouched.current = true;
              const parsed = Math.min(100, Math.max(0, parseLocalizedNumber(event.target.value)));
              setDiscountPercent(event.target.value.trim() ? formatNumber(parsed, 2) : "");
            }}
          />
        </label>

        <div className="totals">
          <div>
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div>
            <span>Descuento ({formatNumber(discountRate, 2)}%)</span>
            <strong>-{formatCurrency(discountValue)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
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
