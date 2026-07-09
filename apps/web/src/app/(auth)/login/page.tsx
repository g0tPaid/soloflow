import { Suspense } from 'react';
import LoginPage from './login-page';

export default function LoginRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-4">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-red-600/20" />
          <p className="text-sm text-muted-foreground">Loading SoloFlow…</p>
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
