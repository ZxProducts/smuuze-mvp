-- プロフィールテーブルに請求書番号カラムを追加
ALTER TABLE profiles ADD COLUMN invoice_number TEXT;

-- コメントを追加
COMMENT ON COLUMN profiles.invoice_number IS '請求書に表示される番号'; 