import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { ensureStoragePermission } from "@/lib/permissions";

export const nativeSave = async (blob: Blob, filename: string) => {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);

    useSaveDialogStore.getState().showSuccess({
      filename,
      directory: "Downloads",
      uri: url,
      fileSize: blob.size,
      blob,
    });
    return;
  }

  try {
    if (Capacitor.getPlatform() === "android") {
      try {
        await ensureStoragePermission();
      } catch {
        // Continue and attempt write anyway in case scoped storage handles it
      }
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    let savedFile;
    let savedDirectory = "Documents";

    try {
      savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
      });
    } catch (primaryErr) {
      console.warn("Direct write to Documents failed, falling back to Data sandbox:", primaryErr);
      savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Data,
      });
      savedDirectory = "App Storage";
    }

    useSaveDialogStore.getState().showSuccess({
      filename,
      directory: savedDirectory,
      uri: savedFile.uri,
      fileSize: blob.size,
      blob,
    });
  } catch (error) {
    console.error("Native save failed completely:", error);
    useSaveDialogStore.getState().showError({
      filename,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Could not save to storage. Please check permissions.",
    });
  }
};
