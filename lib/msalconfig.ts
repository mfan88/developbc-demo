import type { Configuration } from "@azure/msal-browser";
import { getRedirectUri } from "@/lib/msalRedirect";

export const msalClientId =
  process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ??
  "a3178f82-167a-4075-82c6-dd748cb64478";

// Personal Microsoft accounts only (@outlook.com, @hotmail.com, @live.com)
export const msalAuthority =
  "https://login.microsoftonline.com/consumers";

export const graphScopes = ["User.Read", "Files.ReadWrite"] as const;

export const loginRequest = {
  scopes: [...graphScopes],
  authority: msalAuthority,
  prompt: "login" as const,
  extraQueryParameters: {
    domain_hint: "consumers",
  },
};

export const tokenRequest = {
  scopes: ["Files.ReadWrite"],
  authority: msalAuthority,
  extraQueryParameters: {
    domain_hint: "consumers",
  },
};

export function createMsalConfig(): Configuration {
  return {
    auth: {
      clientId: msalClientId,
      authority: msalAuthority,
      redirectUri: getRedirectUri(),
      postLogoutRedirectUri:
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
  };
}
