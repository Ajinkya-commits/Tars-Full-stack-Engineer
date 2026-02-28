import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <SignUp />
    </div>
  );
}
