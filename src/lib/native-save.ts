import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";

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
      const perm = await Filesystem.checkPermissions();
      if (perm.publicStorage !== "granted") {
        await Filesystem.requestPermissions();
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

    const savedFile = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Documents,
    });

    useSaveDialogStore.getState().showSuccess({
      filename,
      directory: "Documents",
      uri: savedFile.uri,
      fileSize: blob.size,
      blob,
    });
  } catch (error) {
    console.error("Native save failed:", error);
    useSaveDialogStore.getState().showError({
      filename,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Could not save to Documents. Please check storage permissions.",
    });
  }
};
