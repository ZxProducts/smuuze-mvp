-- 銀行口座情報フィールドをprofilesテーブルに追加
ALTER TABLE "public"."profiles" 
  ADD COLUMN IF NOT EXISTS "bank_name" text,
  ADD COLUMN IF NOT EXISTS "bank_account_number" text,
  ADD COLUMN IF NOT EXISTS "bank_account_type" text,
  ADD COLUMN IF NOT EXISTS "bank_branch_name" text,
  ADD COLUMN IF NOT EXISTS "bank_branch_code" text;

-- 既存のポリシーを維持
