import { LoginForm } from './login-form';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white text-2xl font-bold">
            S
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          アカウントにログイン
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          または{' '}
          <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            新規登録
          </a>
        </p>
        <div className="mt-8">
          <LoginForm redirectTo={searchParams.redirect || '/time-tracker'} />
        </div>
      </div>
    </div>
  );
}
