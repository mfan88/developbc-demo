function getFileExtension(filename: string) {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) return "";
  return filename.slice(lastDot);
}

export function formatDateTaken(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function buildUploadFilename(originalName: string, dateTaken: Date) {
  return `GMA Video ${formatDateTaken(dateTaken)}${getFileExtension(originalName)}`;
}

export function renameFileForUpload(file: File, dateTaken: Date) {
  return new File([file], buildUploadFilename(file.name, dateTaken), {
    type: file.type,
    lastModified: file.lastModified,
  });
}
