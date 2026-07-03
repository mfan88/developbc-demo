import { Montserrat } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const mont = Montserrat({ weight: "400" });

type ConnectionStatus = {
  connected: boolean;
  username: string | null;
  redirectUri?: string;
  tokenStorage?: string;
};

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/onedrive/status")
      .then((res) => res.json())
      .then((data: ConnectionStatus) => setStatus(data))
      .catch(() => setStatus({ connected: false, username: null }));
  }, []);

  const connected = router.query.connected === "1";
  const error =
    typeof router.query.error === "string" ? router.query.error : null;

  const isSpaRedemptionError =
    error?.includes("AADSTS90023") ||
    error?.includes("Single-Page Application");

  return (
    <main className={`min-h-screen bg-white p-8 text-black ${mont.className}`}>
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div>
          <Link href="/" className="underline text-sm">
            Back to upload portal
          </Link>
          <h1 className="mt-4 text-3xl font-semibold">OneDrive setup</h1>
          <p className="mt-2 text-sm">
            Connect the OneDrive account that should receive all parent uploads.
            Parents will not need to sign in. The server keeps a refresh token
            and renews access automatically.
          </p>
        </div>

        {connected && (
          <Alert>
            <AlertTitle>Connected</AlertTitle>
            <AlertDescription>
              OneDrive is ready to receive uploads.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Connection failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSpaRedemptionError && (
          <Alert>
            <AlertTitle>Fix: use Mobile and desktop platform</AlertTitle>
            <AlertDescription>
              The callback URL is registered as a Single-page application (SPA).
              Server-side token exchange requires the{" "}
              <strong>Mobile and desktop applications</strong> platform instead.
              See the Azure steps below, or use the CLI command (no redirect URI
              needed).
            </AlertDescription>
          </Alert>
        )}

        {status && (
          <p className="text-sm">
            Status:{" "}
            {status.connected
              ? `Connected as ${status.username}`
              : "Not connected"}
            {status.tokenStorage ? ` · Token storage: ${status.tokenStorage}` : null}
          </p>
        )}

        <div className="flex gap-3">
          <Button asChild variant="default">
            <a href="/api/auth/onedrive/login">Connect receiving OneDrive</a>
          </Button>

          <Button
            variant="outline"
            disabled={!status?.connected || isDisconnecting}
            onClick={() => {
              setIsDisconnecting(true);
              void fetch("/api/auth/onedrive/status", { method: "DELETE" })
                .then(() =>
                  setStatus({ connected: false, username: null }),
                )
                .finally(() => setIsDisconnecting(false));
            }}
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </div>
      </div>
    </main>
  );
}
