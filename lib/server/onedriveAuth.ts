import {
  type AccountInfo,
  type AuthorizationCodeRequest,
  type AuthorizationUrlRequest,
  type ICachePlugin,
  PublicClientApplication,
  type SilentFlowRequest,
} from "@azure/msal-node";
import {
  getOneDriveRedirectUri,
  graphScopes,
  msalAuthority,
  msalClientId,
  uploadScopes,
} from "@/lib/server/msalConfig";
import {
  deleteTokenCache,
  readTokenCache,
  writeTokenCache,
} from "@/lib/server/onedriveTokenStore";

let pca: PublicClientApplication | null = null;

function ensureClientId() {
  if (!msalClientId) {
    throw new Error(
      "Missing NEXT_PUBLIC_AZURE_CLIENT_ID. Add it to .env.local first.",
    );
  }
}

function createCachePlugin(): ICachePlugin {
  return {
    beforeCacheAccess: async (cacheContext) => {
      const serialized = await readTokenCache();
      if (serialized) {
        cacheContext.tokenCache.deserialize(serialized);
      }
    },
    afterCacheAccess: async (cacheContext) => {
      if (!cacheContext.cacheHasChanged) return;
      await writeTokenCache(cacheContext.tokenCache.serialize());
    },
  };
}

export function getOneDriveClient() {
  ensureClientId();
  if (!pca) {
    pca = new PublicClientApplication({
      auth: {
        clientId: msalClientId,
        authority: msalAuthority,
      },
      cache: {
        cachePlugin: createCachePlugin(),
      },
    });
  }
  return pca;
}

async function getStoredAccounts(): Promise<AccountInfo[]> {
  const client = getOneDriveClient();
  return client.getTokenCache().getAllAccounts();
}

export async function getConnectedOneDriveAccount(): Promise<AccountInfo | null> {
  const accounts = await getStoredAccounts();
  return accounts[0] ?? null;
}

export async function getOneDriveConnectionStatus() {
  const account = await getConnectedOneDriveAccount();
  return {
    connected: Boolean(account),
    username: account?.username ?? null,
  };
}

export async function getOneDriveLoginUrl(
  codeChallenge: string,
  req?: {
    headers: {
      host?: string;
      "x-forwarded-proto"?: string | string[];
    };
  },
) {
  const client = getOneDriveClient();
  const request: AuthorizationUrlRequest = {
    scopes: [...graphScopes],
    redirectUri: getOneDriveRedirectUri(req),
    prompt: "select_account",
    codeChallenge,
    codeChallengeMethod: "S256",
  };
  return client.getAuthCodeUrl(request);
}

export async function completeOneDriveLogin(
  code: string,
  codeVerifier: string,
  req?: {
    headers: {
      host?: string;
      "x-forwarded-proto"?: string | string[];
    };
  },
) {
  const client = getOneDriveClient();
  const request: AuthorizationCodeRequest = {
    code,
    codeVerifier,
    scopes: [...graphScopes],
    redirectUri: getOneDriveRedirectUri(req),
  };
  return client.acquireTokenByCode(request);
}

export async function getOneDriveAccessToken() {
  const client = getOneDriveClient();
  const account = await getConnectedOneDriveAccount();
  if (!account) {
    throw new Error(
      "OneDrive is not connected. Visit /setup and sign in with the receiving account.",
    );
  }

  const request: SilentFlowRequest = {
    account,
    scopes: [...uploadScopes],
    forceRefresh: false,
  };

  try {
    const result = await client.acquireTokenSilent(request);
    if (!result?.accessToken) {
      throw new Error("Could not acquire OneDrive access token.");
    }
    return result.accessToken;
  } catch {
    throw new Error(
      "OneDrive session expired. Visit /setup and connect the receiving account again.",
    );
  }
}

export async function clearOneDriveConnection() {
  await deleteTokenCache();
  pca = null;
}
