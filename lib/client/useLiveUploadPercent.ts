import { useEffect, useState } from "react";
import { subscribeToLiveUploadPercent } from "@/lib/client/onedriveUpload";

export function useLiveUploadPercent() {
  const [percent, setPercent] = useState(0);

  useEffect(() => subscribeToLiveUploadPercent(setPercent), []);

  return percent;
}
