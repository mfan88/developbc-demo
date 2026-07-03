export const PHYSIO_OPTIONS = [
  { value: "p1", label: "Physio 1" },
  { value: "p2", label: "Physio 2" },
  { value: "p3", label: "Physio 3" },
  { value: "p4", label: "Physio 4" },
] as const;

export type PhysioFolderKey = (typeof PHYSIO_OPTIONS)[number]["value"];

const PHYSIO_FOLDER_NAMES: Record<PhysioFolderKey, string> = {
  p1: "Physio 1",
  p2: "Physio 2",
  p3: "Physio 3",
  p4: "Physio 4",
};

const BASE_UPLOAD_FOLDER = "ParentUploads";

export function resolveUploadFolder(key: string): string | null {
  if (!(key in PHYSIO_FOLDER_NAMES)) {
    return null;
  }

  const folderName = PHYSIO_FOLDER_NAMES[key as PhysioFolderKey];
  return `${BASE_UPLOAD_FOLDER}/${folderName}`;
}
