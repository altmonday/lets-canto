import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <div className="text-2xl font-extrabold tracking-tight">
          <span lang="zh-HK">一齊學</span> <span className="text-sage">✳</span>
        </div>
        <div className="text-xs font-bold tracking-[0.2em] text-muted">LET&apos;S CANTO</div>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Learn Cantonese your way.</h1>
        <p className="mt-3 text-muted">Speak it confidently, read it naturally, and bring it into everyday family life.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-xs text-muted">
        Your lessons and progress are saved to your own private account and sync across devices.{" "}
        <a className="underline" href="/privacy">
          Privacy &amp; data
        </a>
      </p>
    </main>
  );
}
