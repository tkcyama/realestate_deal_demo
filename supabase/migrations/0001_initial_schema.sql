-- ============================================================
-- PropConnect 全フェーズ DB スキーマ
-- 実行場所: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 拡張機能 ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ================================================================
-- ENUM 型
-- ================================================================

CREATE TYPE member_status          AS ENUM ('pending', 'approved', 'suspended');
CREATE TYPE property_use           AS ENUM ('office', 'residential', 'commercial', 'logistics', 'hotel', 'mixed', 'other');
CREATE TYPE property_status        AS ENUM ('draft', 'pending_approval', 'published', 'sold');
CREATE TYPE file_type              AS ENUM ('pdf', 'excel', 'word', 'image', 'other');
CREATE TYPE sale_offer_status      AS ENUM ('pending', 'considering', 'declined', 'expired');
CREATE TYPE purchase_offer_status  AS ENUM ('pending', 'accepted', 'counter_offered', 'declined', 'expired', 'agreed');
CREATE TYPE loan_offer_status      AS ENUM ('pending', 'considering', 'offered_back', 'declined', 'expired', 'completed');
CREATE TYPE party_type             AS ENUM ('fund', 'reit', 'corporate', 'individual', 'other');
CREATE TYPE hotel_contract_type    AS ENUM ('lease', 'management_contract', 'franchise', 'other');
CREATE TYPE notification_type      AS ENUM (
  'member_approved', 'member_rejected',
  'property_approved', 'property_rejected',
  'sale_offer_received', 'sale_offer_responded',
  'purchase_offer_received', 'purchase_offer_responded',
  'loan_offer_received', 'loan_offer_responded',
  'transaction_completed'
);


-- ================================================================
-- テーブル定義
-- ================================================================

-- ── profiles（会員） ──────────────────────────────────────────
CREATE TABLE profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name   TEXT        NOT NULL,
  address        TEXT        NOT NULL,
  department     TEXT,
  full_name      TEXT        NOT NULL,
  title          TEXT,
  email          TEXT        NOT NULL UNIQUE,
  roles          TEXT[]      NOT NULL DEFAULT '{}',   -- ['seller','buyer','lender']
  status         member_status NOT NULL DEFAULT 'pending',
  profile_text   TEXT,
  is_admin       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

-- ── properties（物件マスター） ────────────────────────────────
CREATE TABLE properties (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id             UUID          NOT NULL REFERENCES profiles(id),
  name                  TEXT          NOT NULL,
  address               TEXT          NOT NULL,
  lat                   NUMERIC(10,7),
  lng                   NUMERIC(10,7),
  use_type              property_use  NOT NULL,
  building_year         INTEGER,
  structure             TEXT,
  floors_above          INTEGER,
  floors_below          INTEGER,
  land_area_sqm         NUMERIC(15,2),
  total_floor_area_sqm  NUMERIC(15,2) NOT NULL,
  exclusive_area_sqm    NUMERIC(15,2),
  exclusive_area_tsubo  NUMERIC(15,2),
  exclusive_tsubo_price BIGINT,                      -- 売却希望価格 ÷ 専有面積（坪）
  price                 BIGINT        NOT NULL,       -- 売却希望価格（円）
  noi                   BIGINT,
  ncf                   BIGINT,
  noi_yield             NUMERIC(6,4),
  ncf_yield             NUMERIC(6,4),
  tenant_count          INTEGER,
  occupancy_rate        NUMERIC(5,2),
  monthly_rent_income   BIGINT,
  status                property_status NOT NULL DEFAULT 'draft',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- ── office_details（オフィス詳細） ────────────────────────────
CREATE TABLE office_details (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID        NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  avg_rent_tsubo    NUMERIC(10,0),   -- 円/坪・月（面積加重平均）
  futsukari_ratio   NUMERIC(5,2),    -- 普通借割合（%）
  extracted_by_ai   BOOLEAN     NOT NULL DEFAULT FALSE,
  ai_confidence     NUMERIC(4,3),
  confirmed_at      TIMESTAMPTZ,
  confirmed_by      UUID        REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── residential_details（レジ詳細） ───────────────────────────
CREATE TABLE residential_details (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id        UUID        NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  total_units        INTEGER,
  floor_plan_breakdown JSONB,         -- {"2LDK": 10, "3LDK": 5}
  avg_rent_gross     BIGINT,          -- 円/月（単純平均）
  avg_rent_tsubo     NUMERIC(10,0),   -- 円/坪・月（面積加重平均）
  futsukari_ratio    NUMERIC(5,2),    -- 普通借割合（%）
  extracted_by_ai    BOOLEAN     NOT NULL DEFAULT FALSE,
  ai_confidence      NUMERIC(4,3),
  confirmed_at       TIMESTAMPTZ,
  confirmed_by       UUID        REFERENCES profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── commercial_details（商業詳細） ────────────────────────────
CREATE TABLE commercial_details (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      UUID        NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  avg_rent_tsubo   NUMERIC(10,0),
  extracted_by_ai  BOOLEAN     NOT NULL DEFAULT FALSE,
  ai_confidence    NUMERIC(4,3),
  confirmed_at     TIMESTAMPTZ,
  confirmed_by     UUID        REFERENCES profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── logistics_details（物流詳細） ─────────────────────────────
CREATE TABLE logistics_details (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      UUID        NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  avg_rent_tsubo   NUMERIC(10,0),
  extracted_by_ai  BOOLEAN     NOT NULL DEFAULT FALSE,
  ai_confidence    NUMERIC(4,3),
  confirmed_at     TIMESTAMPTZ,
  confirmed_by     UUID        REFERENCES profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── hotel_details（ホテル詳細） ───────────────────────────────
CREATE TABLE hotel_details (
  id                   UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id          UUID               NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  total_rooms          INTEGER,
  room_type_breakdown  JSONB,             -- {"シングル": 30, "ツイン": 50}
  avg_room_area_sqm    NUMERIC(8,2),
  operator_name        TEXT,
  contract_type        hotel_contract_type,
  adr                  NUMERIC(10,0),     -- 円（直近12か月）
  occ_rate             NUMERIC(5,2),      -- %（直近12か月）
  revpar               NUMERIC(10,0),     -- 円（ADR × Occ）
  gop                  BIGINT,            -- 円
  gop_rate             NUMERIC(5,2),      -- %
  per_key              BIGINT,            -- 円/室（売却希望価格 ÷ 客室数）
  performance_period   TEXT,              -- 例: "2024年4月〜2025年3月"
  extracted_by_ai      BOOLEAN            NOT NULL DEFAULT FALSE,
  ai_confidence        NUMERIC(4,3),
  confirmed_at         TIMESTAMPTZ,
  confirmed_by         UUID               REFERENCES profiles(id),
  updated_at           TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ── property_financials（収支詳細） ───────────────────────────
CREATE TABLE property_financials (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  total_income      BIGINT,
  total_expense     BIGINT,
  noi               BIGINT,
  ncf               BIGINT,
  noi_yield         NUMERIC(6,4),
  ncf_yield         NUMERIC(6,4),
  expense_breakdown JSONB,              -- {"管理費": 1000000, "修繕費": 500000, ...}
  source_type       file_type,
  extracted_by_ai   BOOLEAN     NOT NULL DEFAULT FALSE,
  ai_confidence     NUMERIC(4,3),
  confirmed_at      TIMESTAMPTZ,
  confirmed_by      UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── rent_rolls（RR） ──────────────────────────────────────────
CREATE TABLE rent_rolls (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_label     TEXT,                -- 匿名化ラベル（例: テナントA）
  floor_area_sqm   NUMERIC(15,2),
  floor_area_tsubo NUMERIC(15,2),
  monthly_rent     BIGINT,
  rent_per_tsubo   NUMERIC(10,0),
  lease_type       TEXT,                -- 普通借 / 定期借家 等
  contract_start   DATE,
  contract_end     DATE,
  security_deposit BIGINT,
  extracted_by_ai  BOOLEAN     NOT NULL DEFAULT FALSE,
  ai_confidence    NUMERIC(4,3),
  confirmed_at     TIMESTAMPTZ,
  confirmed_by     UUID        REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── property_documents（アップロード資料） ────────────────────
CREATE TABLE property_documents (
  id                          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                 UUID      NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  uploader_id                 UUID      NOT NULL REFERENCES profiles(id),
  file_name                   TEXT      NOT NULL,
  file_type                   file_type NOT NULL,
  storage_path                TEXT      NOT NULL,
  file_size_bytes             BIGINT,
  ai_processed                BOOLEAN   NOT NULL DEFAULT FALSE,
  ai_processing_started_at    TIMESTAMPTZ,
  ai_processing_completed_at  TIMESTAMPTZ,
  ai_error                    TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── teasers（AI生成 Teaser PDF） ──────────────────────────────
CREATE TABLE teasers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  storage_path    TEXT        NOT NULL,
  version         INTEGER     NOT NULL DEFAULT 1,
  is_latest       BOOLEAN     NOT NULL DEFAULT TRUE,
  generated_by_ai BOOLEAN     NOT NULL DEFAULT TRUE,
  masked_fields   TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── sale_offers（売却オファー：売主 → 買主） ──────────────────
CREATE TABLE sale_offers (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID              NOT NULL REFERENCES properties(id),
  sender_id    UUID              NOT NULL REFERENCES profiles(id),
  recipient_id UUID              NOT NULL REFERENCES profiles(id),
  status       sale_offer_status NOT NULL DEFAULT 'pending',
  message      TEXT,
  expires_at   TIMESTAMPTZ       NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ── purchase_offers（購入オファー：買主 → 売主） ──────────────
CREATE TABLE purchase_offers (
  id                 UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id        UUID                  NOT NULL REFERENCES properties(id),
  sale_offer_id      UUID                  REFERENCES sale_offers(id),
  buyer_id           UUID                  NOT NULL REFERENCES profiles(id),
  seller_id          UUID                  NOT NULL REFERENCES profiles(id),
  offer_price        BIGINT                NOT NULL,
  conditions         TEXT,
  message            TEXT,
  counter_price      BIGINT,
  counter_conditions TEXT,
  status             purchase_offer_status NOT NULL DEFAULT 'pending',
  expires_at         TIMESTAMPTZ           NOT NULL,
  responded_at       TIMESTAMPTZ,
  agreed_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

-- ── loan_offers（ローンオファー：売主or買主 → レンダー） ──────
CREATE TABLE loan_offers (
  id                       UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id              UUID              NOT NULL REFERENCES properties(id),
  purchase_offer_id        UUID              REFERENCES purchase_offers(id),
  sender_id                UUID              NOT NULL REFERENCES profiles(id),
  lender_id                UUID              NOT NULL REFERENCES profiles(id),
  loan_amount              BIGINT,
  message                  TEXT,
  lender_conditions        TEXT,
  lender_loan_amount       BIGINT,
  lender_term_months       INTEGER,
  lender_interest_rate_min NUMERIC(6,4),
  lender_interest_rate_max NUMERIC(6,4),
  status                   loan_offer_status NOT NULL DEFAULT 'pending',
  expires_at               TIMESTAMPTZ       NOT NULL,
  responded_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ── transactions（取引事例：匿名化済み） ──────────────────────
CREATE TABLE transactions (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID         REFERENCES properties(id),
  purchase_offer_id     UUID         REFERENCES purchase_offers(id),
  sale_price            BIGINT       NOT NULL,
  noi                   BIGINT,
  ncf                   BIGINT,
  noi_yield             NUMERIC(6,4),
  ncf_yield             NUMERIC(6,4),
  use_type              property_use NOT NULL,
  total_floor_area_sqm  NUMERIC(15,2),
  exclusive_area_tsubo  NUMERIC(15,2),
  exclusive_tsubo_price BIGINT,
  avg_rent_tsubo        NUMERIC(10,0),   -- オフィス・レジ・商業・物流
  per_key               BIGINT,          -- ホテルのみ（円/室）
  seller_type           party_type,
  buyer_type            party_type,
  area_prefecture       TEXT,
  area_city             TEXT,
  closed_at             DATE         NOT NULL,
  registered_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  registered_by         UUID         REFERENCES profiles(id),
  is_public             BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ── notifications（通知） ─────────────────────────────────────
CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  ref_id     UUID,
  message    TEXT              NOT NULL,
  is_read    BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ── audit_logs（監査ログ：90日保持） ─────────────────────────
CREATE TABLE audit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES profiles(id),
  action     TEXT        NOT NULL,
  table_name TEXT,
  record_id  UUID,
  details    JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ================================================================
-- インデックス
-- ================================================================

-- properties
CREATE INDEX idx_properties_seller_id         ON properties(seller_id);
CREATE INDEX idx_properties_status            ON properties(status);
CREATE INDEX idx_properties_use_type          ON properties(use_type);
CREATE INDEX idx_properties_lat_lng           ON properties(lat, lng);
CREATE INDEX idx_properties_price             ON properties(price);
CREATE INDEX idx_properties_noi_yield         ON properties(noi_yield);
CREATE INDEX idx_properties_deleted_at        ON properties(deleted_at) WHERE deleted_at IS NULL;

-- 用途別詳細
CREATE INDEX idx_office_details_property_id      ON office_details(property_id);
CREATE INDEX idx_residential_details_property_id ON residential_details(property_id);
CREATE INDEX idx_commercial_details_property_id  ON commercial_details(property_id);
CREATE INDEX idx_logistics_details_property_id   ON logistics_details(property_id);
CREATE INDEX idx_hotel_details_property_id       ON hotel_details(property_id);

-- 収支・RR
CREATE INDEX idx_property_financials_property_id ON property_financials(property_id);
CREATE INDEX idx_rent_rolls_property_id          ON rent_rolls(property_id);

-- 資料
CREATE INDEX idx_property_documents_property_id  ON property_documents(property_id);
CREATE INDEX idx_property_documents_unprocessed  ON property_documents(property_id, ai_processed) WHERE ai_processed = FALSE;

-- Teaser
CREATE INDEX idx_teasers_property_id   ON teasers(property_id);
CREATE INDEX idx_teasers_latest        ON teasers(property_id) WHERE is_latest = TRUE;

-- 売却オファー
CREATE INDEX idx_sale_offers_property_id  ON sale_offers(property_id);
CREATE INDEX idx_sale_offers_sender_id    ON sale_offers(sender_id);
CREATE INDEX idx_sale_offers_recipient_id ON sale_offers(recipient_id);
CREATE INDEX idx_sale_offers_status       ON sale_offers(status);
CREATE INDEX idx_sale_offers_expires_at   ON sale_offers(expires_at);

-- 購入オファー
CREATE INDEX idx_purchase_offers_property_id ON purchase_offers(property_id);
CREATE INDEX idx_purchase_offers_buyer_id    ON purchase_offers(buyer_id);
CREATE INDEX idx_purchase_offers_seller_id   ON purchase_offers(seller_id);
CREATE INDEX idx_purchase_offers_status      ON purchase_offers(status);

-- ローンオファー
CREATE INDEX idx_loan_offers_property_id ON loan_offers(property_id);
CREATE INDEX idx_loan_offers_sender_id   ON loan_offers(sender_id);
CREATE INDEX idx_loan_offers_lender_id   ON loan_offers(lender_id);
CREATE INDEX idx_loan_offers_status      ON loan_offers(status);

-- 取引事例
CREATE INDEX idx_transactions_use_type    ON transactions(use_type);
CREATE INDEX idx_transactions_area        ON transactions(area_prefecture, area_city);
CREATE INDEX idx_transactions_closed_at   ON transactions(closed_at);
CREATE INDEX idx_transactions_seller_type ON transactions(seller_type);
CREATE INDEX idx_transactions_buyer_type  ON transactions(buyer_type);
CREATE INDEX idx_transactions_public      ON transactions(is_public) WHERE is_public = TRUE;

-- 通知
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread  ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- 監査ログ
CREATE INDEX idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_record     ON audit_logs(table_name, record_id);


-- ================================================================
-- ヘルパー関数
-- ================================================================

-- updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 承認済み会員かチェック（RLS 内で使用）
CREATE OR REPLACE FUNCTION is_approved_member()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND status = 'approved'
      AND deleted_at IS NULL
  )
$$;

-- 管理者かチェック（RLS 内で使用）
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_admin = TRUE
      AND deleted_at IS NULL
  )
$$;

-- 物件詳細アクセス権限チェック
-- 売主 or 管理者 or 売却オファーを「検討する」で受諾済みの買主
CREATE OR REPLACE FUNCTION has_property_detail_access(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM properties
    WHERE id = p_property_id AND seller_id = auth.uid() AND deleted_at IS NULL
  )
  OR is_admin_user()
  OR EXISTS (
    SELECT 1 FROM sale_offers
    WHERE property_id = p_property_id
      AND recipient_id = auth.uid()
      AND status = 'considering'
  )
$$;

-- auth.users INSERT 時に profiles を自動作成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, company_name, address)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', '')
  );
  RETURN NEW;
END;
$$;


-- ================================================================
-- トリガー
-- ================================================================

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_properties
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_office_details
  BEFORE UPDATE ON office_details
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_residential_details
  BEFORE UPDATE ON residential_details
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_commercial_details
  BEFORE UPDATE ON commercial_details
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_logistics_details
  BEFORE UPDATE ON logistics_details
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_hotel_details
  BEFORE UPDATE ON hotel_details
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_property_financials
  BEFORE UPDATE ON property_financials
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_rent_rolls
  BEFORE UPDATE ON rent_rolls
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_sale_offers
  BEFORE UPDATE ON sale_offers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_purchase_offers
  BEFORE UPDATE ON purchase_offers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_loan_offers
  BEFORE UPDATE ON loan_offers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Supabase Auth へのフック
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ================================================================
-- Row Level Security（RLS）
-- ================================================================

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_details      ENABLE ROW LEVEL SECURITY;
ALTER TABLE residential_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_details  ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_details   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_details       ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_rolls          ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teasers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_offers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_offers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_offers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────────
-- 自分自身のプロフィールは常に参照可能
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 承認済み会員は他の承認済み会員のプロフィールを参照可能（オファー送信先選択に使用）
CREATE POLICY "profiles_select_approved_members"
  ON profiles FOR SELECT
  USING (status = 'approved' AND deleted_at IS NULL AND is_approved_member());

-- 管理者は全件参照・更新可能
CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (is_admin_user());

-- 自分自身のプロフィールを更新可能
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────
-- properties
-- ────────────────────────────────────────────────────────────────
-- 承認済み会員は公開中物件の基本情報を参照可能
CREATE POLICY "properties_select_published"
  ON properties FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL AND is_approved_member());

-- 売主は自分の物件（全ステータス）を参照可能
CREATE POLICY "properties_select_own"
  ON properties FOR SELECT
  USING (seller_id = auth.uid() AND deleted_at IS NULL);

-- 管理者は全件参照可能
CREATE POLICY "properties_admin_select"
  ON properties FOR SELECT
  USING (is_admin_user());

-- 承認済み会員は物件を新規登録可能
CREATE POLICY "properties_insert"
  ON properties FOR INSERT
  WITH CHECK (is_approved_member() AND seller_id = auth.uid());

-- 売主のみ自分の物件を更新可能
CREATE POLICY "properties_update_own"
  ON properties FOR UPDATE
  USING (seller_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (seller_id = auth.uid());

-- 管理者は全物件を更新可能（承認処理）
CREATE POLICY "properties_admin_update"
  ON properties FOR UPDATE
  USING (is_admin_user());

-- ────────────────────────────────────────────────────────────────
-- 用途別詳細テーブル（共通ポリシー）
-- office_details / residential_details / commercial_details
-- logistics_details / hotel_details
-- 閲覧: 売主 or 管理者 or 売却オファー「検討する」受諾済みの買主
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "office_details_select"
  ON office_details FOR SELECT
  USING (has_property_detail_access(property_id));

CREATE POLICY "office_details_write"
  ON office_details FOR ALL
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND seller_id = auth.uid())
    OR is_admin_user()
  );

CREATE POLICY "residential_details_select"
  ON residential_details FOR SELECT
  USING (has_property_detail_access(property_id));

CREATE POLICY "residential_details_write"
  ON residential_details FOR ALL
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND seller_id = auth.uid())
    OR is_admin_user()
  );

CREATE POLICY "commercial_details_select"
  ON commercial_details FOR SELECT
  USING (has_property_detail_access(property_id));

CREATE POLICY "commercial_details_write"
  ON commercial_details FOR ALL
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND seller_id = auth.uid())
    OR is_admin_user()
  );

CREATE POLICY "logistics_details_select"
  ON logistics_details FOR SELECT
  USING (has_property_detail_access(property_id));

CREATE POLICY "logistics_details_write"
  ON logistics_details FOR ALL
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND seller_id = auth.uid())
    OR is_admin_user()
  );

CREATE POLICY "hotel_details_select"
  ON hotel_details FOR SELECT
  USING (has_property_detail_access(property_id));

CREATE POLICY "hotel_details_write"
  ON hotel_details FOR ALL
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND seller_id = auth.uid())
    OR is_admin_user()
  );

-- ────────────────────────────────────────────────────────────────
-- property_financials / rent_rolls / property_documents / teasers
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "property_financials_select"
  ON property_financials FOR SELECT
  USING (has_property_detail_access(property_id));

CREATE POLICY "property_financials_write"
  ON property_financials FOR ALL
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND seller_id = auth.uid())
    OR is_admin_user()
  );

CREATE POLICY "rent_rolls_select"
  ON rent_rolls FOR SELECT
  USING (has_property_detail_access(property_id));

CREATE POLICY "rent_rolls_write"
  ON rent_rolls FOR ALL
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND seller_id = auth.uid())
    OR is_admin_user()
  );

CREATE POLICY "property_documents_select"
  ON property_documents FOR SELECT
  USING (has_property_detail_access(property_id));

CREATE POLICY "property_documents_insert"
  ON property_documents FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (SELECT 1 FROM properties WHERE id = property_id AND seller_id = auth.uid())
  );

CREATE POLICY "property_documents_admin"
  ON property_documents FOR ALL
  USING (is_admin_user());

CREATE POLICY "teasers_select"
  ON teasers FOR SELECT
  USING (has_property_detail_access(property_id));

CREATE POLICY "teasers_write"
  ON teasers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM properties WHERE id = property_id AND seller_id = auth.uid())
    OR is_admin_user()
  );

-- ────────────────────────────────────────────────────────────────
-- sale_offers
-- ────────────────────────────────────────────────────────────────
-- 送信者または受信者が参照可能
CREATE POLICY "sale_offers_select"
  ON sale_offers FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR is_admin_user());

-- 売主（承認済み）がオファーを送信
CREATE POLICY "sale_offers_insert"
  ON sale_offers FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND is_approved_member());

-- 受信者がステータスを更新（検討する / 見送り）
CREATE POLICY "sale_offers_update_recipient"
  ON sale_offers FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- 管理者は全件操作可能
CREATE POLICY "sale_offers_admin"
  ON sale_offers FOR ALL
  USING (is_admin_user());

-- ────────────────────────────────────────────────────────────────
-- purchase_offers
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "purchase_offers_select"
  ON purchase_offers FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin_user());

-- 売却オファーを「検討する」で受諾済みの買主が購入オファーを送信
CREATE POLICY "purchase_offers_insert"
  ON purchase_offers FOR INSERT
  WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sale_offers
      WHERE property_id = purchase_offers.property_id
        AND recipient_id = auth.uid()
        AND status = 'considering'
    )
  );

-- 売主がオファーに返答（承諾・条件変更・拒否）
CREATE POLICY "purchase_offers_update_seller"
  ON purchase_offers FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "purchase_offers_admin"
  ON purchase_offers FOR ALL
  USING (is_admin_user());

-- ────────────────────────────────────────────────────────────────
-- loan_offers
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "loan_offers_select"
  ON loan_offers FOR SELECT
  USING (sender_id = auth.uid() OR lender_id = auth.uid() OR is_admin_user());

-- 合意済み取引の当事者がローンオファーを送信
CREATE POLICY "loan_offers_insert"
  ON loan_offers FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM purchase_offers
      WHERE id = loan_offers.purchase_offer_id
        AND status = 'agreed'
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- レンダーが返答
CREATE POLICY "loan_offers_update_lender"
  ON loan_offers FOR UPDATE
  USING (lender_id = auth.uid())
  WITH CHECK (lender_id = auth.uid());

CREATE POLICY "loan_offers_admin"
  ON loan_offers FOR ALL
  USING (is_admin_user());

-- ────────────────────────────────────────────────────────────────
-- transactions（取引事例）
-- ────────────────────────────────────────────────────────────────
-- 承認済み会員は公開中の取引事例を参照可能
CREATE POLICY "transactions_select_public"
  ON transactions FOR SELECT
  USING (is_public = TRUE AND is_approved_member());

-- 管理者のみ登録・更新・非公開設定
CREATE POLICY "transactions_admin"
  ON transactions FOR ALL
  USING (is_admin_user());

-- ────────────────────────────────────────────────────────────────
-- notifications
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- audit_logs
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "audit_logs_admin_select"
  ON audit_logs FOR SELECT
  USING (is_admin_user());


-- ================================================================
-- Storage バケット
-- ================================================================
-- 以下は Supabase Dashboard > Storage から手動で作成するか、
-- 下記 SQL を実行して作成してください。

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('property-images',    'property-images',    FALSE),
  ('property-documents', 'property-documents', FALSE),
  ('teasers',            'teasers',            FALSE)
ON CONFLICT DO NOTHING;

-- Storage ポリシー（property-images）
CREATE POLICY "property_images_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-images'
    AND is_approved_member()
  );

CREATE POLICY "property_images_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND is_approved_member()
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage ポリシー（property-documents）
CREATE POLICY "property_documents_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-documents'
    AND has_property_detail_access((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "property_documents_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-documents'
    AND is_approved_member()
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Storage ポリシー（teasers）
CREATE POLICY "teasers_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'teasers'
    AND has_property_detail_access((storage.foldername(name))[1]::UUID)
  );
