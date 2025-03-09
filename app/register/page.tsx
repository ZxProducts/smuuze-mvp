import { RegisterForm } from './register-form';

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white text-2xl font-bold">
            C
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          新規アカウント登録
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          または{' '}
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            既存のアカウントでログイン
          </a>
        </p>
        <div className="mt-8">
          <RegisterForm redirectTo={searchParams.redirect || '/time-tracker'} />
        </div>
      </div>
    </div>
  );
}
