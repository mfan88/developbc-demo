/**
 * One-time local setup: connect the receiving OneDrive account via device code.
 * Run: npm run onedrive:connect
 */
import { getOneDriveClient } from "../lib/server/onedriveAuth";
import { graphScopes } from "../lib/server/msalConfig";

async function main() {
  const client = getOneDriveClient();

  console.log("\nConnecting OneDrive for parent uploads...\n");

  const result = await client.acquireTokenByDeviceCode({
    scopes: [...graphScopes],
    deviceCodeCallback: (response) => {
      console.log(response.message);
      console.log("");
    },
  });

  if (!result) {
    throw new Error("Device code sign-in did not return a token.");
  }

  console.log(`\nConnected as ${result.account?.username ?? "unknown"}`);
  console.log("Token cache saved. Parents can now upload at http://localhost:3000\n");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
