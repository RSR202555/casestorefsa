-- ============================================================
-- Operacoes atomicas de estoque
-- Evita race condition em checkout, pagamento e cancelamento.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reserve_inventory_items(
  p_items JSONB,
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_stock INTEGER;
  v_reserved INTEGER;
  v_available INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item ->> 'product_id')::UUID;
    v_quantity := (item ->> 'quantity')::INTEGER;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY:%', v_product_id;
    END IF;

    UPDATE public.inventory
    SET
      reserved_stock = reserved_stock + v_quantity,
      updated_at = NOW()
    WHERE product_id = v_product_id
      AND (stock_quantity - reserved_stock) >= v_quantity
    RETURNING stock_quantity, reserved_stock
      INTO v_stock, v_reserved;

    IF NOT FOUND THEN
      SELECT COALESCE(stock_quantity - reserved_stock, 0)
        INTO v_available
      FROM public.inventory
      WHERE product_id = v_product_id;

      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:%:%',
        v_product_id,
        v_quantity,
        COALESCE(v_available, 0);
    END IF;

    INSERT INTO public.inventory_movements (
      product_id,
      reason,
      quantity_delta,
      stock_after,
      order_id
    )
    VALUES (
      v_product_id,
      'reservation',
      -v_quantity,
      v_stock,
      p_order_id
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_reserved_inventory_items(
  p_items JSONB,
  p_order_id UUID,
  p_triggered_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_stock INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item ->> 'product_id')::UUID;
    v_quantity := (item ->> 'quantity')::INTEGER;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY:%', v_product_id;
    END IF;

    UPDATE public.inventory
    SET
      stock_quantity = stock_quantity - v_quantity,
      reserved_stock = reserved_stock - v_quantity,
      updated_at = NOW()
    WHERE product_id = v_product_id
      AND stock_quantity >= v_quantity
      AND reserved_stock >= v_quantity
    RETURNING stock_quantity
      INTO v_stock;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'RESERVATION_NOT_FOUND:%:%',
        v_product_id,
        v_quantity;
    END IF;

    INSERT INTO public.inventory_movements (
      product_id,
      reason,
      quantity_delta,
      stock_after,
      order_id,
      triggered_by
    )
    VALUES (
      v_product_id,
      'purchase',
      -v_quantity,
      v_stock,
      p_order_id,
      p_triggered_by
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_reserved_inventory_items(
  p_items JSONB,
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_stock INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item ->> 'product_id')::UUID;
    v_quantity := (item ->> 'quantity')::INTEGER;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY:%', v_product_id;
    END IF;

    UPDATE public.inventory
    SET
      reserved_stock = GREATEST(0, reserved_stock - v_quantity),
      updated_at = NOW()
    WHERE product_id = v_product_id
    RETURNING stock_quantity
      INTO v_stock;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO public.inventory_movements (
      product_id,
      reason,
      quantity_delta,
      stock_after,
      order_id
    )
    VALUES (
      v_product_id,
      'reservation_cancel',
      v_quantity,
      v_stock,
      p_order_id
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_inventory_items(JSONB, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_reserved_inventory_items(JSONB, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_reserved_inventory_items(JSONB, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_inventory_items(JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_reserved_inventory_items(JSONB, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_reserved_inventory_items(JSONB, UUID) TO service_role;
