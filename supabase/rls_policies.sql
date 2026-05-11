-- ============================================================
-- Row Level Security (RLS) ポリシー
-- Supabase SQL Editor に貼り付けて実行してください
-- 既存ポリシーを一旦削除してから再作成するため、何度でも実行可能です
-- ============================================================

-- ── 既存ポリシーを削除 ───────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select"          ON profiles;
DROP POLICY IF EXISTS "profiles_update"          ON profiles;

DROP POLICY IF EXISTS "properties_select"        ON properties;
DROP POLICY IF EXISTS "properties_insert"        ON properties;
DROP POLICY IF EXISTS "properties_update"        ON properties;
DROP POLICY IF EXISTS "properties_delete"        ON properties;

DROP POLICY IF EXISTS "sale_offers_select"       ON sale_offers;
DROP POLICY IF EXISTS "sale_offers_insert"       ON sale_offers;
DROP POLICY IF EXISTS "sale_offers_update"       ON sale_offers;

DROP POLICY IF EXISTS "purchase_offers_select"   ON purchase_offers;
DROP POLICY IF EXISTS "purchase_offers_insert"   ON purchase_offers;
DROP POLICY IF EXISTS "purchase_offers_update"   ON purchase_offers;

DROP POLICY IF EXISTS "notifications_select"     ON notifications;
DROP POLICY IF EXISTS "notifications_insert"     ON notifications;
DROP POLICY IF EXISTS "notifications_update"     ON notifications;


-- ── ヘルパー関数 ────────────────────────────────────────────

-- 合意済みオファーの存在確認（RLS をバイパス）
-- 買主は他の買主の purchase_offers を参照できないため SECURITY DEFINER で全件確認
CREATE OR REPLACE FUNCTION public.check_property_has_agreed_offer(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM purchase_offers
    WHERE property_id = p_property_id
      AND status = 'agreed'
  );
$$;

-- 管理者チェック（profiles テーブル自身の RLS をバイパス）
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid() AND deleted_at IS NULL),
    false
  );
$$;


-- ── 1. profiles ────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全会員のプロフィールを閲覧可能（オファー時に社名・氏名が必要）
-- 管理者は論理削除済みも閲覧可能
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL OR is_current_user_admin());

-- 自分のプロフィールのみ更新可、管理者は全員更新可（承認/停止処理）
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_current_user_admin());


-- ── 2. properties ──────────────────────────────────────────
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 閲覧: published は全員、自分の物件は全ステータス、管理者は全件
CREATE POLICY "properties_select" ON properties
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      status = 'published'
      OR seller_id = auth.uid()
      OR is_current_user_admin()
    )
  );

-- 登録: seller_id が自分自身のもののみ
CREATE POLICY "properties_insert" ON properties
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

-- 更新: 自分の draft/pending_approval は編集可、管理者は承認操作のため全件可
CREATE POLICY "properties_update" ON properties
  FOR UPDATE TO authenticated
  USING (
    (seller_id = auth.uid() AND status IN ('draft', 'pending_approval', 'published'))
    OR is_current_user_admin()
  );

-- 削除: 自分の draft のみ（論理削除を使うので基本的に不要だが念のため）
CREATE POLICY "properties_delete" ON properties
  FOR DELETE TO authenticated
  USING (
    (seller_id = auth.uid() AND status = 'draft')
    OR is_current_user_admin()
  );


-- ── 3. sale_offers ─────────────────────────────────────────
ALTER TABLE sale_offers ENABLE ROW LEVEL SECURITY;

-- 送信者・受信者のみ閲覧可、管理者は全件
CREATE POLICY "sale_offers_select" ON sale_offers
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR is_current_user_admin());

-- 作成: sender_id が自分自身
CREATE POLICY "sale_offers_insert" ON sale_offers
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- 更新: 送受信者双方が更新可（返答・ステータス変更）、管理者も可
CREATE POLICY "sale_offers_update" ON sale_offers
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR is_current_user_admin()
  );


-- ── 4. purchase_offers ─────────────────────────────────────
ALTER TABLE purchase_offers ENABLE ROW LEVEL SECURITY;

-- 買主・売主のみ閲覧可、管理者は全件
CREATE POLICY "purchase_offers_select" ON purchase_offers
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_current_user_admin());

-- 作成: buyer_id が自分自身
CREATE POLICY "purchase_offers_insert" ON purchase_offers
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- 更新: 買主・売主双方が更新可（合意・カウンター・承諾・拒否）、管理者も可
CREATE POLICY "purchase_offers_update" ON purchase_offers
  FOR UPDATE TO authenticated
  USING (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
    OR is_current_user_admin()
  );


-- ── 5. notifications ───────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 自分宛の通知のみ閲覧
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Server Actions が他ユーザー宛に通知を作成するため認証済みなら許可
-- （実際のアクセス制御は Server Actions 側のロジックで担保）
-- ※ 将来的には SUPABASE_SERVICE_ROLE_KEY を使うサーバー専用クライアントに移行推奨
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 更新: 自分の通知のみ既読に変更可
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
