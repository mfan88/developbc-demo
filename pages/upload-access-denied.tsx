import ddaLogo from "@/assets/dda-logo.svg";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Montserrat } from "next/font/google";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const mont = Montserrat({ weight: "400" });

function getErrorMessage(
  errorKey: string | null,
  signedIn: string | null,
  expected: string | null,
) {
  if (errorKey === "wrong_account") {
    if (signedIn && expected) {
      return `You signed in as ${signedIn}, but this portal receives uploads to ${expected}. Use that same Microsoft account, or reconnect OneDrive in setup with the account you want to use.`;
    }
    return "That Microsoft account is not the receiving OneDrive account for this portal.";
  }

  const messages: Record<string, string> = {
    not_configured:
      "OneDrive has not been connected yet. Complete setup before signing in here.",
    missing_code: "Sign-in did not complete. Try again.",
    missing_pkce_verifier: "Sign-in session expired. Try again.",
    missing_account: "Could not read the signed-in Microsoft account.",
  };

  return messages[errorKey ?? ""] ?? null;
}

export default function UploadAccessDeniedPage() {
  const router = useRouter();
  const errorKey =
    typeof router.query.error === "string" ? router.query.error : null;
  const signedIn =
    typeof router.query.signedIn === "string" ? router.query.signedIn : null;
  const expected =
    typeof router.query.expected === "string" ? router.query.expected : null;

  const message =
    getErrorMessage(errorKey, signedIn, expected) ||
    (errorKey && !getErrorMessage(errorKey, signedIn, expected)
      ? decodeURIComponent(errorKey)
      : null) ||
    "You need a parent upload link or the receiving OneDrive account to access this page.";

  const isRedirectUriError =
    message.includes("redirect_uri") || message.includes("AADSTS90023");

  return (
    <div className="min-h-screen min-w-screen bg-white">
      <header className="box-border p-2 justify-left">
        <Image className="w-60" src={ddaLogo} alt="ddalogo" />
      </header>

      <main
        className={`mx-auto mt-16 flex max-w-lg flex-col items-center gap-6 px-4 text-black ${mont.className}`}
      >
        <h1 className="text-3xl font-semibold">Upload access required</h1>
        <Alert className="w-full" variant="destructive">
          <AlertTitle>Sign-in required</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        {isRedirectUriError && (
          <Alert className="w-full">
            <AlertTitle>Fix Azure redirect URI</AlertTitle>
            <AlertDescription>
              In Azure Portal → App registrations → Authentication →{" "}
              <strong>Mobile and desktop applications</strong>, add this exact
              redirect URI:
              <code className="mt-2 block break-all rounded bg-black/5 px-2 py-1 text-sm">
                http://localhost:3000/api/auth/upload-access/callback
              </code>
              If you use a custom domain in production, add that URL too. Do
              not register it under Single-page application.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="default">
            <a href="/api/auth/upload-access/login">
              {expected
                ? `Sign in as ${expected}`
                : "Sign in with receiving account"}
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-black text-black hover:bg-black/5 hover:text-black"
          >
            <Link href="/setup">Go to setup</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
