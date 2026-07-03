import ddaLogo from "@/assets/dda-logo.svg";
import Image from "next/image";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const mont = Montserrat({ weight: "400" });

export default function LinkExpiredPage() {
  return (
    <div className="min-h-screen min-w-screen bg-white">
      <header className="box-border p-2 justify-left">
        <Image className="w-60" src={ddaLogo} alt="ddalogo" />
      </header>

      <main
        className={`mx-auto mt-16 flex max-w-lg flex-col items-center gap-6 px-4 text-black ${mont.className}`}
      >
        <h1 className="text-3xl font-semibold">Link unavailable</h1>
        <Alert className="w-full">
          <AlertTitle>This upload link has expired or was already used</AlertTitle>
          <AlertDescription>
            Ask your clinic for a new parent upload link. Each link works once
            and is valid for 24 hours.
          </AlertDescription>
        </Alert>
        <Link href="/setup" className="text-sm underline">
          Clinic admin? Go to setup
        </Link>
      </main>
    </div>
  );
}
