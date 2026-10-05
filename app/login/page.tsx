import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            C
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Creator OS</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to review scripts for your creators.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
