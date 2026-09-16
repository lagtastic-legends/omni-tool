"use client";

import { create } from "zustand";

export interface SaveDialogPayload {
  isOpen: boolean;
  status: "success" | "error";
  filename: string;
  directory?: string;
  uri?: string;
  fileSize?: number;
  blob?: Blob;
  errorMessage?: string;
}

interface SaveDialogStore extends SaveDialogPayload {
  showSuccess: (opts: {
    filename: string;
    directory?: string;
    uri?: string;
    fileSize?: number;
    blob?: Blob;
  }) => void;
  showError: (opts: {
    filename?: string;
    errorMessage?: string;
  }) => void;
  close: () => void;
}

export const useSaveDialogStore = create<SaveDialogStore>((set) => ({
  isOpen: false,
  status: "success",
  filename: "",
  directory: "Documents",
  uri: undefined,
  fileSize: undefined,
  blob: undefined,
  errorMessage: undefined,

  showSuccess: (opts) =>
    set({
      isOpen: true,
      status: "success",
      filename: opts.filename,
      directory: opts.directory || "Documents",
      uri: opts.uri,
      fileSize: opts.fileSize ?? opts.blob?.size,
      blob: opts.blob,
      errorMessage: undefined,
    }),

  showError: (opts) =>
    set({
      isOpen: true,
      status: "error",
      filename: opts.filename || "",
      directory: undefined,
      uri: undefined,
      fileSize: undefined,
      blob: undefined,
      errorMessage:
        opts.errorMessage ||
        "Could not save file to Documents folder. Please check your storage permissions.",
    }),

  close: () =>
    set({
      isOpen: false,
      uri: undefined,
      blob: undefined,
    }),
}));
