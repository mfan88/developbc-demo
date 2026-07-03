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

        <div className="rounded-md border p-4 text-sm">
          <p className="font-medium">Vercel production</p>
          <p className="mt-2">
            Vercel cannot write to the project filesystem. Before connecting on
            production, create a{" "}
            <a
              href="https://vercel.com/docs/vercel-blob"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Vercel Blob
            </a>{" "}
            store for this project (Storage tab → Create → Blob), then redeploy.
            Vercel injects <code>BLOB_READ_WRITE_TOKEN</code> automatically.
          </p>
        </div>

        <div className="rounded-md border p-4 text-sm">
          <p className="font-medium">Option A — Browser connect (redirect URI)</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              Azure Portal → App registrations → your app → Authentication
            </li>
            <li>
              Under <strong>Mobile and desktop applications</strong>, add this
              redirect URI (not under Single-page application):
            </li>
          </ol>
          <code className="mt-2 block break-all rounded bg-muted p-2">
            {status?.redirectUri ??
              "http://localhost:3000/api/auth/onedrive/callback"}
          </code>
          <p className="mt-2">
            If the same URI is listed under Single-page application, remove it
            from there.
          </p>
          <p className="mt-2">
            Set <strong>Allow public client flows</strong> to Yes, save, wait ~1
            minute, then click Connect again.
          </p>
        </div>

        <div className="rounded-md border p-4 text-sm">
          <p className="font-medium">Option B — CLI (recommended for local dev)</p>
          <p className="mt-2">
            Device code flow avoids redirect URI platform issues. From the
            project root:
          </p>
          <code className="mt-2 block rounded bg-muted p-2">npm run onedrive:connect</code>
          <p className="mt-2 text-muted-foreground">
            Sign in with the receiving Outlook account when prompted, then
            refresh this page.
          </p>
        </div>
      </div>
    </main>
  );
}
