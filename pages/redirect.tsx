import { useEffect, useState } from "react";
import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

export default function Redirect() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    broadcastResponseToMainFrame().catch((err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      console.error("Redirect bridge failed:", err);
    });
  }, []);

  if (error) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <p>Authentication error: {error}</p>
        <a href="/">Return home</a>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <p>Processing authentication...</p>
    </main>
  );
}
