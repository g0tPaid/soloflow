import { Suspense } from 'react';
import LoginPage from './login-page';

export default function LoginRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginPage />
    </Suspense>
  );
}
