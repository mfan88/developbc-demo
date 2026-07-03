import { PublicClientApplication } from "@azure/msal-browser";
import { createMsalConfig } from "@/lib/msalconfig";

let msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication {
  if (typeof window === "undefined") {
    throw new Error("MSAL can only be used in the browser");
  }

  if (!msalInstance) {
    msalInstance = new PublicClientApplication(createMsalConfig());
  }

  return msalInstance;
}
