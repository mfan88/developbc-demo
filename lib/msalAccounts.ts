import type { AccountInfo } from "@azure/msal-browser";

// Tenant ID for personal Microsoft accounts (MSA)
export const PERSONAL_MICROSOFT_TENANT_ID =
  "9188040d-6c67-4c50-bda7-96744df639e3";

const CONSUMER_EMAIL_SUFFIXES = [
  "@outlook.com",
  "@hotmail.com",
  "@live.com",
  "@msn.com",
];

export function isPersonalMicrosoftAccount(
  account: AccountInfo | null | undefined,
): boolean {
  if (!account) return false;

  const tenantIds = [
    account.tenantId,
    account.idTokenClaims?.tid as string | undefined,
  ].filter(Boolean);

  if (tenantIds.some((id) => id === PERSONAL_MICROSOFT_TENANT_ID)) {
    return true;
  }

  const issuer = String(account.idTokenClaims?.iss ?? "");
  if (
    issuer.includes("login.live.com") ||
    issuer.includes("/consumers")
  ) {
    return true;
  }

  const email = (account.username || "").toLowerCase();
  return CONSUMER_EMAIL_SUFFIXES.some((suffix) => email.endsWith(suffix));
}

export function getPreferredAccount(
  instance: { getActiveAccount: () => AccountInfo | null },
  accounts: AccountInfo[],
): AccountInfo | null {
  const active = instance.getActiveAccount();
  if (active) return active;

  const personal = accounts.find((account) => isPersonalMicrosoftAccount(account));
  if (personal) return personal;

  return accounts[0] ?? null;
}

export function getAccountTypeLabel(
  account: { tenantId?: string; username?: string } | null | undefined,
) {
  if (!account) return null;
  if (isPersonalMicrosoftAccount(account as AccountInfo)) {
    return `Personal account (${account.username ?? "signed in"})`;
  }
  return `Work/school account (${account.username ?? "signed in"})`;
}

export function getWrongAccountHelp(
  account: AccountInfo | null | undefined,
  allAccounts: AccountInfo[],
) {
  if (account && isPersonalMicrosoftAccount(account)) {
    return null;
  }

  const others = allAccounts.filter(
    (entry) => entry.homeAccountId !== account?.homeAccountId,
  );
  const personalCached = others.find((entry) =>
    isPersonalMicrosoftAccount(entry),
  );

  if (personalCached) {
    return `A personal account (${personalCached.username}) is already signed in on this browser. Click "Use personal account" below.`;
  }

  const email = account?.username ?? "this account";
  return `${email} is a work/school Microsoft login, not personal OneDrive. Click Sign out of all accounts, then sign in with your new @outlook.com account only.`;
}
