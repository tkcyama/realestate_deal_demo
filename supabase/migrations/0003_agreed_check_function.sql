-- RLSを迂回して「同一物件に合意済み購入オファーが存在するか」を確認する関数
-- SECURITY DEFINER により呼び出し元のRLSではなく関数オーナー権限で実行される
CREATE OR REPLACE FUNCTION check_property_has_agreed_offer(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM purchase_offers
    WHERE property_id = p_property_id
      AND status = 'agreed'
  );
$$;
