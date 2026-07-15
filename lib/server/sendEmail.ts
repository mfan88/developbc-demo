import { getMailAccessToken } from "@/lib/server/onedriveAuth";

export type Email = {
  subject: string;
  body: {
    contentType: "Text" | "HTML";
    content: string;
  };
  to: string[];
  cc?: string[];
};

function toRecipients(addresses: string[]) {
  return addresses.map((address) => ({
    emailAddress: { address },
  }));
}

export async function sendEmail(email: Email): Promise<void> {
  const accessToken = await getMailAccessToken();

  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: email.subject,
        body: email.body,
        toRecipients: toRecipients(email.to),
        ...(email.cc?.length ? { ccRecipients: toRecipients(email.cc) } : {}),
      },
      saveToSentItems: true,
    }),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(
      `Failed to send email (${res.status}): ${details || res.statusText}`,
    );
  }
}
