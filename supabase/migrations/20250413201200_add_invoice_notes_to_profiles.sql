-- 請求書備考フィールドをprofilesテーブルに追加
ALTER TABLE "public"."profiles" 
  ADD COLUMN IF NOT EXISTS "invoice_notes" text;

-- 既存のポリシーを維持
