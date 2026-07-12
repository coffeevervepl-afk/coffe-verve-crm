-- Add grind to CRM orders so the manager can see the grind choice made on the
-- shop. shop_order_items.grind ('whole'/'ground') had no place to land in orders,
-- so create_crm_orders_for_shop_order (which mirrors shop items into orders,
-- one row per unit) is updated to copy it. Existing orders keep grind = NULL.
--
-- Already applied to the shared Supabase project via MCP; kept here for history.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS grind text;

COMMENT ON COLUMN public.orders.grind IS
  'Grind choice copied from shop_order_items.grind (whole/ground); null for orders created before this column existed.';

CREATE OR REPLACE FUNCTION public.create_crm_orders_for_shop_order(p_shop_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_shop public.shop_orders;
  v_client_id uuid;
  v_client_lang text;
  v_item record;
  v_crm_product_id uuid;
  v_new_order_id uuid;
  v_first_order_id uuid;
  v_init_status text;
  i int;
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE shop_order_id = p_shop_order_id) THEN
    RETURN; -- already mirrored, idempotent no-op
  END IF;

  SELECT * INTO v_shop FROM public.shop_orders WHERE id = p_shop_order_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT id INTO v_client_id FROM public.clients
    WHERE (v_shop.customer_email IS NOT NULL AND lower(email) = lower(v_shop.customer_email))
       OR (v_shop.customer_phone IS NOT NULL AND phone = v_shop.customer_phone)
    LIMIT 1;

  IF v_client_id IS NULL THEN
    v_client_lang := CASE upper(COALESCE(v_shop.language,'ru'))
      WHEN 'RU' THEN 'RU' WHEN 'PL' THEN 'PL' WHEN 'UA' THEN 'UA' ELSE 'RU' END;
    INSERT INTO public.clients (name, email, phone, language, source, username)
    VALUES (v_shop.customer_name, v_shop.customer_email, v_shop.customer_phone, v_client_lang, 'shop',
            NULLIF(regexp_replace(trim(COALESCE(v_shop.customer_telegram, '')), '^@+', ''), ''))
    RETURNING id INTO v_client_id;
  END IF;

  v_init_status := map_shop_status_to_crm(v_shop.status, v_shop.payment_status);
  v_first_order_id := NULL;

  FOR v_item IN SELECT * FROM public.shop_order_items WHERE order_id = p_shop_order_id LOOP
    SELECT crm_product_id INTO v_crm_product_id FROM public.shop_products WHERE id = v_item.shop_product_id;

    FOR i IN 1..GREATEST(v_item.quantity, 1) LOOP
      INSERT INTO public.orders (client_id, product_id, weight, price, total, status, shop_order_id, grind, notes)
      VALUES (v_client_id, v_crm_product_id, v_item.weight, v_item.unit_price, v_item.unit_price, v_init_status,
              p_shop_order_id, v_item.grind, 'Импортировано из заказа магазина №' || v_shop.order_number)
      RETURNING id INTO v_new_order_id;

      IF v_first_order_id IS NULL THEN
        v_first_order_id := v_new_order_id;
      END IF;
    END LOOP;
  END LOOP;

  UPDATE public.shop_orders SET crm_order_id = v_first_order_id WHERE id = p_shop_order_id;
END;
$function$;
