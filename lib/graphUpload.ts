export type OneDriveUploadResult = {
  id: string;
  name: string;
  webUrl: string;
  size: number;
};

export async function uploadToOneDrive(
  file: File,
  accessToken: string,
  folder: string,
): Promise<OneDriveUploadResult> {
  console.log("Folder Received" + folder);
  const path = `${folder}/${file.name}`;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    },
  );

  if (!res.ok) {
    const details = await res.text();
    if (details.includes("SPO license")) {
      throw new Error(
        "This upload needs a personal @outlook.com or @hotmail.com account. You are signed in with a work/school account that has no OneDrive license. Click Sign out, then sign in with a personal Microsoft account.",
      );
    }
    throw new Error(
      `Upload failed (${res.status}): ${details || res.statusText}`,
    );
  }

  const item = (await res.json()) as OneDriveUploadResult;
  if (!item.webUrl) {
    throw new Error("Upload succeeded but OneDrive did not return a file URL.");
  }

  return item;
}
