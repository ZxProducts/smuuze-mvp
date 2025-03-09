import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white text-2xl font-bold">
            C
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          パスワードのリセット
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          登録したメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
        </p>
        <div className="mt-8">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
