import { PluginListenerHandle, registerPlugin } from '@capacitor/core';

export interface OmniRecorderPlugin {
  startRecording(options: { internalAudio: boolean; microphone: boolean; quality: string; fps: number }): Promise<void>;
  stopRecording(): Promise<{ uri: string }>;
  requestPermissions(options?: { permissions?: string[] }): Promise<{ camera?: string; microphone?: string; notifications?: string; storage?: string }>;
  checkPermissions(): Promise<{ camera?: string; microphone?: string; notifications?: string; storage?: string }>;
  requestAllPermissions(): Promise<{ camera: string; microphone: string; notifications: string; storage: string }>;
  checkAllPermissions(): Promise<{ camera: string; microphone: string; notifications: string; storage: string }>;
  openAppSettings(): Promise<void>;
  resolveMediaName(options: { name: string }): Promise<{ realName?: string }>;
  readClipboard(): Promise<{ value: string }>;
  writeClipboard(options: { value: string }): Promise<void>;
  addListener(eventName: 'onRecordComplete', listenerFunc: (info: { uri: string }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const OmniRecorder = registerPlugin<OmniRecorderPlugin>('OmniRecorder');
