-- 買主が購入オファーを更新できるポリシーを追加
--
-- 既存の purchase_offers_update_seller は売主専用のため、
-- 買主が行う2種類の操作が RLS でブロックされていた。

-- ① 買主がカウンターオファーに返答（counter_offered → accepted / declined）
CREATE POLICY "purchase_offers_update_buyer_counter"
  ON purchase_offers FOR UPDATE
  USING  (buyer_id = auth.uid() AND status = 'counter_offered')
  WITH CHECK (buyer_id = auth.uid() AND (status = 'accepted' OR status = 'declined'));

-- ② 買主が取引合意を確定（accepted → agreed）
CREATE POLICY "purchase_offers_update_buyer_agree"
  ON purchase_offers FOR UPDATE
  USING  (buyer_id = auth.uid() AND status = 'accepted')
  WITH CHECK (buyer_id = auth.uid() AND status = 'agreed');
