import ddaLogo from "@/assets/dda-logo.svg";
import Image from "next/image";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon } from "lucide-react";
import { type OneDriveUploadResult } from "@/lib/graphUpload";
import { uploadFileToOneDrive } from "@/lib/client/onedriveUpload";
import { useLiveUploadPercent } from "@/lib/client/useLiveUploadPercent";
import {
  ACCEPTED_UPLOAD_TYPES,
  formatMaxUploadSize,
  MAX_UPLOAD_BYTES,
} from "@/lib/uploadLimits";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { PHYSIO_OPTIONS } from "@/lib/uploadFolders";
import { Progress } from "@/components/ui/progress";

const montTitle = Montserrat({
  weight: "600",
});

const mont = Montserrat({
  weight: "400",
});

export default function Home() {
  const [files, setFiles] = useState<{ file: File; previewUrl: string } | null>(
    null,
  );
  const [selectedPhysio, setSelectedPhysio] = useState<string | undefined>(
    undefined,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<OneDriveUploadResult | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const uploadPercent = useLiveUploadPercent();

  const runUpload = useCallback(async (file: File, folder: string) => {
    setUploadError(null);
    setUploadResult(null);
    setIsUploading(true);
    if (!folder) return;

    try {
      const result = await uploadFileToOneDrive(file, folder);
      setUploadResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setUploadError(message);
      console.error("OneDrive upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_UPLOAD_TYPES,
    multiple: false,
    maxFiles: 1,
    maxSize: MAX_UPLOAD_BYTES,
    onDrop: (acceptedFile) => {
      const [newFile] = acceptedFile;
      if (!newFile) return;

      setUploadError(null);
      setUploadResult(null);
      setFiles({ file: newFile, previewUrl: URL.createObjectURL(newFile) });
    },
    onDropRejected: (rejections) => {
      const rejection = rejections[0];
      const tooLarge = rejection?.errors.some(
        (error) => error.code === "file-too-large",
      );
      setUploadError(
        tooLarge
          ? `Files must be ${formatMaxUploadSize()} or smaller.`
          : "Only image and video files are supported.",
      );
    },
  });
  return (
    <div className="min-h-screen min-w-screen bg-white">
      <header className="box-border p-2 justify-left">
        <Image className="w-60" src={ddaLogo} alt="ddalogo" />
      </header>

      <div className="flex flex-col items-center gap-8 mt-5">
        <div className="flex w-full justify-center items-center">
          <h1 className={`text-6xl text-black ${montTitle.className}`}>
            PARENT UPLOAD PORTAL
          </h1>
        </div>
        <div>
          <Select value={selectedPhysio} onValueChange={setSelectedPhysio}>
            <SelectTrigger className="w-60 max-w-60 text-black">
              <SelectValue placeholder="Select your physio"></SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PHYSIO_OPTIONS.map((physio) => (
                <SelectItem key={physio.value} value={physio.value}>
                  {physio.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          {...getRootProps()}
          className={`w-120 min-w-30 max-w-120 h-60 min-h-15 max-h-60 flex flex-col text-black ${mont.className} justify-center items-center border border-dashed border-black rounded-md ${isDragActive ? "dragging" : ""}`}
        >
          <input {...getInputProps()} />
          <p className={`text-xl`}>Drag & drop photos or videos here!</p>
          <p className={`text-sm`}>or click to select files (up to {formatMaxUploadSize()})</p>
        </div>

        {files?.file && (
          <Card className="h-[8%] w-[25%] border border-black gap-1 px-2 py-1 flex flex-row">
            <div className="flex justify-center items-center">
              {isUploading ? <Spinner /> : <CheckCircle2Icon color="green" />}
            </div>
            <CardContent>
              <CardTitle className="m-0">
                {uploadResult
                  ? `File Uploaded \nSending to Physio: ${selectedPhysio}`
                  : "File Selected"}
              </CardTitle>
              <CardDescription className="m-0">
                {files.file.name}
              </CardDescription>
            </CardContent>
          </Card>
        )}

        <p className={`text-sm text-black ${mont.className}`}>
          No sign-in needed. Files are sent to the clinic OneDrive account.
        </p>

        {isUploading && (
          <Progress
            value={uploadPercent}
            color="black"
            className="w-60 h-2 text-black"
          />
        )}

        {uploadError && (
          <Alert variant="destructive">
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>
              {uploadError}
              {uploadError.includes("/setup") ? null : (
                <>
                  {" "}
                  If this is the first time, an admin may need to connect
                  OneDrive at{" "}
                  <Link href="/setup" className="underline">
                    /setup
                  </Link>
                  .
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="ghost"
          className={`border border-black text-black hover:text-black text-xl ${mont.className}`}
          size="lg"
          disabled={!files?.file || !selectedPhysio || isUploading}
          onClick={() => {
            if (!files?.file || !selectedPhysio) {
              toast.error("Select your physio before uploading.");
              return;
            }
            void runUpload(files.file, selectedPhysio);
          }}
        >
          {isUploading ? "Uploading..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
