import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export const nativeSave = async (blob: Blob, filename: string) => {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

    alert("File saved directly to Documents folder!\n" + filename);
  } catch (error) {
    console.error("Native save failed:", error);
    alert("Could not save to Documents. Please check storage permissions.");
  }
};
