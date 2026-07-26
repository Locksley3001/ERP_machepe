import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseLocalizedNumber } from "@/lib/number-format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const optionalText = z.string().trim().optional().default("");
const localizedNumber = () => z.preprocess(parseLocalizedNumber, z.number());
const money = localizedNumber().pipe(z.number().min(0)).default(0);
const anyQuantity = localizedNumber();
const nonNegativeQuantity = localizedNumber().pipe(z.number().min(0)).default(0);
const positiveQuantity = localizedNumber().pipe(z.number().positive());

const supplierSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  company: optionalText,
  contact: optionalText,
  phone: optionalText,
  whatsapp: optionalText,
  email: optionalText,
  address: optionalText,
  city: optionalText,
  socials: optionalText,
  website: optionalText,
  notes: optionalText
});

const inventorySchema = z.object({
  code: z.string().trim().min(1, "El codigo es obligatorio"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  category: optionalText,
  kind: z.enum(["raw_material", "packaging", "prepared", "finished_product", "cleaning", "asset", "tool"]),
  description: optionalText,
  unit: z.string().trim().min(1, "La unidad es obligatoria"),
  quantity: nonNegativeQuantity,
  minimumQuantity: nonNegativeQuantity,
  maximumQuantity: nonNegativeQuantity,
  purchaseCost: money,
  averageCost: money,
  referencePrice: money,
  location: optionalText,
  barcode: optionalText,
  imageUrl: optionalText,
  supplierId: optionalText,
  notes: optionalText
});

const menuSchema = z.object({
  sku: z.string().trim().min(1, "El SKU es obligatorio"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  category: optionalText,
  price: money,
  favorite: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true)
});

const recipeSchema = z.object({
  productId: z.string().uuid("Selecciona un producto de la carta"),
  version: z.coerce.number().int().min(1).default(1),
  isActive: z.coerce.boolean().default(true),
  notes: optionalText,
  ingredients: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        quantity: positiveQuantity,
        unit: z.string().trim().min(1),
        unitCost: money
      })
    )
    .min(1, "Agrega al menos un ingrediente")
});

const purchaseSchema = z.object({
  supplierId: z.string().uuid("Selecciona un proveedor"),
  invoiceNumber: z.string().trim().min(1, "La factura es obligatoria"),
  purchasedAt: z.string().optional(),
  lines: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        quantity: positiveQuantity,
        unitCost: money,
        taxRate: localizedNumber().pipe(z.number().min(0).max(1)).default(0),
        discount: money
      })
    )
    .min(1, "Agrega al menos un producto")
});

const productionSchema = z.object({
  outputItemId: z.string().uuid("Selecciona el producto producido"),
  quantityProduced: positiveQuantity,
  producedAt: z.string().optional(),
  notes: optionalText,
  inputs: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        quantity: positiveQuantity,
        unitCost: money
      })
    )
    .min(1, "Agrega al menos un insumo")
});

const movementSchema = z.object({
  inventoryItemId: z.string().uuid("Selecciona un articulo"),
  quantity: anyQuantity.refine((value) => value !== 0, "La cantidad no puede ser cero"),
  unitCost: money,
  notes: optionalText
});

const saleSchema = z.object({
  paymentMethod: z.enum(["cash", "card", "transfer", "mixed"]),
  discount: money,
  notes: optionalText,
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: positiveQuantity
      })
    )
    .min(1, "Agrega al menos un producto")
});

const userSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().email("Correo invalido"),
  password: z.string().min(8, "La contrasena debe tener minimo 8 caracteres"),
  role: z.enum(["admin", "employee"])
});

function cleanText(value: string) {
  return value.trim() || null;
}

function inventoryStatus(currentQuantity: number, minimumQuantity: number) {
  if (currentQuantity <= 0) {
    return "out_of_stock";
  }

  if (currentQuantity <= minimumQuantity) {
    return "low_stock";
  }

  return "active";
}

async function getOrCreateCategory(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  name: string,
  module: "inventory" | "menu"
) {
  const cleanName = name.trim();
  if (!cleanName) {
    return null;
  }

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("name", cleanName)
    .eq("module", module)
    .is("parent_id", null)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: cleanName, module })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function writeAudit(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
  entityTable: string,
  entityId: string,
  metadata: Record<string, unknown>
) {
  await supabase.from("audit_log").insert({
    actor_id: userId,
    action: "create",
    entity_table: entityTable,
    entity_id: entityId,
    metadata
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ module: string }> }) {
  const { module } = await context.params;
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase no esta configurado. Los formularios solo guardan cuando existe conexion real." },
      { status: 503 }
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesion para guardar." }, { status: 401 });
  }

  const payload = await request.json();

  try {
    if (module === "suppliers") {
      const values = supplierSchema.parse(payload);
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          name: values.name,
          company: cleanText(values.company),
          contact: cleanText(values.contact),
          phone: cleanText(values.phone),
          whatsapp: cleanText(values.whatsapp),
          email: cleanText(values.email),
          address: cleanText(values.address),
          city: cleanText(values.city),
          socials: cleanText(values.socials),
          website: cleanText(values.website),
          notes: cleanText(values.notes)
        })
        .select("id")
        .single();

      if (error) throw error;
      await writeAudit(supabase, user.id, "suppliers", data.id, { name: values.name });
      return NextResponse.json({ id: data.id });
    }

    if (module === "inventory") {
      const values = inventorySchema.parse(payload);
      const categoryId = await getOrCreateCategory(supabase, values.category, "inventory");
      const initialQuantity = values.quantity;
      const averageCost = values.averageCost || values.purchaseCost;

      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          code: values.code,
          name: values.name,
          category_id: categoryId,
          kind: values.kind,
          description: cleanText(values.description),
          unit: values.unit,
          quantity: 0,
          minimum_quantity: values.minimumQuantity,
          maximum_quantity: values.maximumQuantity,
          purchase_cost: values.purchaseCost,
          average_cost: averageCost,
          reference_price: values.referencePrice,
          status: inventoryStatus(0, values.minimumQuantity),
          location: cleanText(values.location),
          barcode: cleanText(values.barcode),
          image_url: cleanText(values.imageUrl),
          supplier_id: values.supplierId || null,
          notes: cleanText(values.notes)
        })
        .select("id")
        .single();

      if (error) throw error;

      if (initialQuantity > 0) {
        const { error: movementError } = await supabase.from("inventory_movements").insert({
          inventory_item_id: data.id,
          type: "manual_adjustment",
          quantity: initialQuantity,
          unit_cost: averageCost,
          reference_table: "inventory_items",
          reference_id: data.id,
          notes: "Cantidad inicial",
          responsible_id: user.id
        });
        if (movementError) throw movementError;
      }

      await writeAudit(supabase, user.id, "inventory_items", data.id, { code: values.code, name: values.name });
      return NextResponse.json({ id: data.id });
    }

    if (module === "menu") {
      const values = menuSchema.parse(payload);
      const categoryId = await getOrCreateCategory(supabase, values.category, "menu");
      const { data, error } = await supabase
        .from("menu_products")
        .insert({
          sku: values.sku,
          name: values.name,
          category_id: categoryId,
          price: values.price,
          favorite: values.favorite,
          active: values.active
        })
        .select("id")
        .single();

      if (error) throw error;
      await writeAudit(supabase, user.id, "menu_products", data.id, { sku: values.sku, name: values.name });
      return NextResponse.json({ id: data.id });
    }

    if (module === "recipes") {
      const values = recipeSchema.parse(payload);

      const { data, error } = await supabase
        .from("recipes")
        .insert({
          product_id: values.productId,
          version: values.version,
          is_active: false,
          notes: cleanText(values.notes),
          created_by: user.id
        })
        .select("id")
        .single();

      if (error) throw error;

      const { error: itemsError } = await supabase.from("recipe_items").insert(
        values.ingredients.map((ingredient) => ({
          recipe_id: data.id,
          inventory_item_id: ingredient.inventoryItemId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          unit_cost_snapshot: ingredient.unitCost
        }))
      );

      if (itemsError) throw itemsError;

      if (values.isActive) {
        const { error: deactivateError } = await supabase
          .from("recipes")
          .update({ is_active: false })
          .eq("product_id", values.productId)
          .neq("id", data.id);
        if (deactivateError) throw deactivateError;

        const { error: activateError } = await supabase.from("recipes").update({ is_active: true }).eq("id", data.id);
        if (activateError) throw activateError;
      }

      await writeAudit(supabase, user.id, "recipes", data.id, { productId: values.productId, version: values.version });
      return NextResponse.json({ id: data.id });
    }

    if (module === "purchases") {
      const values = purchaseSchema.parse(payload);
      const subtotal = values.lines.reduce((total, line) => total + line.quantity * line.unitCost, 0);
      const taxTotal = values.lines.reduce((total, line) => total + line.quantity * line.unitCost * line.taxRate, 0);
      const discountTotal = values.lines.reduce((total, line) => total + line.discount, 0);
      const total = subtotal + taxTotal - discountTotal;

      const { data, error } = await supabase
        .from("purchases")
        .insert({
          supplier_id: values.supplierId,
          invoice_number: values.invoiceNumber,
          purchased_at: values.purchasedAt || new Date().toISOString(),
          subtotal,
          tax_total: taxTotal,
          discount_total: discountTotal,
          total,
          created_by: user.id
        })
        .select("id")
        .single();

      if (error) throw error;

      const { error: linesError } = await supabase.from("purchase_lines").insert(
        values.lines.map((line) => ({
          purchase_id: data.id,
          inventory_item_id: line.inventoryItemId,
          quantity: line.quantity,
          unit_cost: line.unitCost,
          tax_rate: line.taxRate,
          discount: line.discount
        }))
      );
      if (linesError) throw linesError;

      const { error: movementError } = await supabase.from("inventory_movements").insert(
        values.lines.map((line) => ({
          inventory_item_id: line.inventoryItemId,
          type: "purchase",
          quantity: line.quantity,
          unit_cost: line.unitCost,
          reference_table: "purchases",
          reference_id: data.id,
          notes: `Compra ${values.invoiceNumber}`,
          responsible_id: user.id
        }))
      );
      if (movementError) throw movementError;

      await writeAudit(supabase, user.id, "purchases", data.id, { invoiceNumber: values.invoiceNumber });
      return NextResponse.json({ id: data.id });
    }

    if (module === "production") {
      const values = productionSchema.parse(payload);
      const totalCost = values.inputs.reduce((total, input) => total + input.quantity * input.unitCost, 0);

      const { data, error } = await supabase
        .from("production_batches")
        .insert({
          output_item_id: values.outputItemId,
          quantity_produced: values.quantityProduced,
          total_cost: totalCost,
          responsible_id: user.id,
          produced_at: values.producedAt || new Date().toISOString(),
          notes: cleanText(values.notes)
        })
        .select("id")
        .single();

      if (error) throw error;

      const { error: inputsError } = await supabase.from("production_inputs").insert(
        values.inputs.map((input) => ({
          batch_id: data.id,
          inventory_item_id: input.inventoryItemId,
          quantity: input.quantity,
          unit_cost_snapshot: input.unitCost
        }))
      );
      if (inputsError) throw inputsError;

      const outputUnitCost = values.quantityProduced > 0 ? totalCost / values.quantityProduced : 0;
      const { error: movementError } = await supabase.from("inventory_movements").insert([
        ...values.inputs.map((input) => ({
          inventory_item_id: input.inventoryItemId,
          type: "production_input",
          quantity: -Math.abs(input.quantity),
          unit_cost: input.unitCost,
          reference_table: "production_batches",
          reference_id: data.id,
          notes: "Insumo consumido en produccion",
          responsible_id: user.id
        })),
        {
          inventory_item_id: values.outputItemId,
          type: "production_output",
          quantity: values.quantityProduced,
          unit_cost: outputUnitCost,
          reference_table: "production_batches",
          reference_id: data.id,
          notes: "Producto producido",
          responsible_id: user.id
        }
      ]);
      if (movementError) throw movementError;

      await writeAudit(supabase, user.id, "production_batches", data.id, { outputItemId: values.outputItemId });
      return NextResponse.json({ id: data.id });
    }

    if (module === "movements") {
      const values = movementSchema.parse(payload);
      const { data, error } = await supabase
        .from("inventory_movements")
        .insert({
          inventory_item_id: values.inventoryItemId,
          type: "manual_adjustment",
          quantity: values.quantity,
          unit_cost: values.unitCost,
          reference_table: "inventory_movements",
          notes: cleanText(values.notes),
          responsible_id: user.id
        })
        .select("id")
        .single();

      if (error) throw error;
      await writeAudit(supabase, user.id, "inventory_movements", data.id, { quantity: values.quantity });
      return NextResponse.json({ id: data.id });
    }

    if (module === "sales") {
      const values = saleSchema.parse(payload);
      const productIds = values.lines.map((line) => line.productId);

      const { data: products, error: productsError } = await supabase
        .from("menu_products")
        .select("id, name, price")
        .in("id", productIds);
      if (productsError) throw productsError;

      const productMap = new Map((products ?? []).map((product) => [product.id as string, product]));
      const missingProduct = values.lines.find((line) => !productMap.has(line.productId));
      if (missingProduct) {
        throw new Error("Uno de los productos ya no existe en la carta.");
      }

      const { data: recipes, error: recipesError } = await supabase
        .from("recipes")
        .select("id, product_id")
        .in("product_id", productIds)
        .eq("is_active", true);
      if (recipesError) throw recipesError;

      const recipeByProduct = new Map((recipes ?? []).map((recipe) => [recipe.product_id as string, recipe]));
      const productWithoutRecipe = values.lines.find((line) => !recipeByProduct.has(line.productId));
      if (productWithoutRecipe) {
        const product = productMap.get(productWithoutRecipe.productId);
        throw new Error(`${product?.name ?? "El producto"} no tiene receta activa.`);
      }

      const recipeIds = (recipes ?? []).map((recipe) => recipe.id as string);
      const { data: recipeItems, error: recipeItemsError } = await supabase
        .from("recipe_items")
        .select("recipe_id, inventory_item_id, quantity, unit_cost_snapshot")
        .in("recipe_id", recipeIds);
      if (recipeItemsError) throw recipeItemsError;

      const ingredientsByRecipe = new Map<string, typeof recipeItems>();
      (recipeItems ?? []).forEach((ingredient) => {
        const recipeId = ingredient.recipe_id as string;
        ingredientsByRecipe.set(recipeId, [...(ingredientsByRecipe.get(recipeId) ?? []), ingredient]);
      });

      const requiredInventory = new Map<string, number>();
      const saleLines = values.lines.map((line) => {
        const product = productMap.get(line.productId);
        const recipe = recipeByProduct.get(line.productId);
        const ingredients = ingredientsByRecipe.get(recipe?.id as string) ?? [];

        if (!ingredients.length) {
          throw new Error(`${product?.name ?? "El producto"} tiene receta activa sin ingredientes.`);
        }

        ingredients.forEach((ingredient) => {
          const itemId = ingredient.inventory_item_id as string;
          const required = Number(ingredient.quantity ?? 0) * line.quantity;
          requiredInventory.set(itemId, (requiredInventory.get(itemId) ?? 0) + required);
        });

        const unitCost = ingredients.reduce(
          (total, ingredient) => total + Number(ingredient.quantity ?? 0) * Number(ingredient.unit_cost_snapshot ?? 0),
          0
        );

        return {
          productId: line.productId,
          recipeId: recipe?.id as string,
          productName: String(product?.name ?? ""),
          quantity: line.quantity,
          unitPrice: Number(product?.price ?? 0),
          unitCost
        };
      });

      const inventoryIds = [...requiredInventory.keys()];
      const { data: stockRows, error: stockError } = await supabase
        .from("inventory_items")
        .select("id, name, quantity")
        .in("id", inventoryIds);
      if (stockError) throw stockError;

      const stockMap = new Map((stockRows ?? []).map((item) => [item.id as string, item]));
      for (const [itemId, required] of requiredInventory.entries()) {
        const stock = stockMap.get(itemId);
        if (!stock) {
          throw new Error("La receta contiene un articulo de inventario que ya no existe.");
        }

        if (Number(stock.quantity ?? 0) < required) {
          throw new Error(`Inventario insuficiente: ${stock.name}.`);
        }
      }

      const subtotal = saleLines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
      const total = Math.max(0, subtotal - values.discount);
      const costTotal = saleLines.reduce((totalCost, line) => totalCost + line.quantity * line.unitCost, 0);
      const invoiceNumber = `F-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          invoice_number: invoiceNumber,
          payment_method: values.paymentMethod,
          subtotal,
          discount: values.discount,
          total,
          cost_total: costTotal,
          notes: cleanText(values.notes),
          created_by: user.id
        })
        .select("id")
        .single();
      if (saleError) throw saleError;

      const { error: saleLinesError } = await supabase.from("sale_lines").insert(
        saleLines.map((line) => ({
          sale_id: sale.id,
          product_id: line.productId,
          recipe_id: line.recipeId,
          product_name_snapshot: line.productName,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          unit_cost_snapshot: line.unitCost
        }))
      );
      if (saleLinesError) throw saleLinesError;

      const movementRows: {
        inventory_item_id: string;
        type: "sale";
        quantity: number;
        unit_cost: number;
        reference_table: string;
        reference_id: string;
        notes: string;
        responsible_id: string;
      }[] = [];

      values.lines.forEach((line) => {
        const recipe = recipeByProduct.get(line.productId);
        const ingredients = ingredientsByRecipe.get(recipe?.id as string) ?? [];
        ingredients.forEach((ingredient) => {
          movementRows.push({
            inventory_item_id: ingredient.inventory_item_id as string,
            type: "sale",
            quantity: -Math.abs(Number(ingredient.quantity ?? 0) * line.quantity),
            unit_cost: Number(ingredient.unit_cost_snapshot ?? 0),
            reference_table: "sales",
            reference_id: sale.id,
            notes: `Factura ${invoiceNumber}`,
            responsible_id: user.id
          });
        });
      });

      const { error: movementsError } = await supabase.from("inventory_movements").insert(movementRows);
      if (movementsError) throw movementsError;

      await writeAudit(supabase, user.id, "sales", sale.id, { invoiceNumber, total });
      return NextResponse.json({ id: sale.id, invoiceNumber });
    }

    if (module === "audit") {
      const values = userSchema.parse(payload);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Solo un administrador puede crear usuarios." }, { status: 403 });
      }

      const admin = createAdminClient();
      if (!admin) {
        return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY para crear usuarios." }, { status: 503 });
      }

      const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: { full_name: values.fullName }
      });

      if (userError) throw userError;
      if (!createdUser.user) {
        throw new Error("Supabase no devolvio el usuario creado.");
      }

      const { error: upsertError } = await admin.from("profiles").upsert({
        id: createdUser.user.id,
        full_name: values.fullName,
        role: values.role,
        active: true
      });

      if (upsertError) throw upsertError;
      await writeAudit(supabase, user.id, "profiles", createdUser.user.id, { email: values.email, role: values.role });
      return NextResponse.json({ id: createdUser.user.id });
    }

    return NextResponse.json({ error: "Modulo no soportado para creacion." }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el registro.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
