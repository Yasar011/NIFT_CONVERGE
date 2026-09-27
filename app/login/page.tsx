import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import LoginPanel from "./LoginPanel";

export const metadata = { title: "Sign in | NIFT Jodhpur Converge 2026" };

export default function LoginPage() {
  return (
    <>
      <PageHeader
        kicker="NIFT accounts only"
        title={<>Sign<br />in</>}
        intro="Use your @nift.ac.in Google account to register, see your status, get your QR pass and vote."
        tone="bg-blue text-paper"
      />
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8 lg:py-16">
        <Suspense>
          <LoginPanel />
        </Suspense>
      </div>
    </>
  );
}
