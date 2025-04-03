-- チームテーブルに請求先住所フィールドを追加
ALTER TABLE "public"."teams" 
  ADD COLUMN IF NOT EXISTS "postal_code" text,
  ADD COLUMN IF NOT EXISTS "prefecture" text,
  ADD COLUMN IF NOT EXISTS "city" text,
  ADD COLUMN IF NOT EXISTS "address1" text,
  ADD COLUMN IF NOT EXISTS "address2" text;

-- 既存のポリシーを維持
