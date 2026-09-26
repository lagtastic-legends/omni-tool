import { PluginListenerHandle, registerPlugin } from '@capacitor/core';

export interface OmniRecorderPlugin {
  startRecording(options: { internalAudio: boolean; microphone: boolean; quality: string; fps: number }): Promise<void>;
  stopRecording(): Promise<{ uri: string }>;
  requestPermissions(options?: { permissions?: string[] }): Promise<{ camera?: string; microphone?: string; notifications?: string; storage?: string; photos?: string; audio?: string }>;
  checkPermissions(): Promise<{ camera?: string; microphone?: string; notifications?: string; storage?: string; photos?: string; audio?: string }>;
  requestAllPermissions(): Promise<{ camera: string; microphone: string; notifications: string; storage: string; photos: string; audio: string }>;
  checkAllPermissions(): Promise<{ camera: string; microphone: string; notifications: string; storage: string; photos: string; audio: string }>;
  requestPhotosPermission(): Promise<{ camera: string; microphone: string; notifications: string; storage: string; photos: string; audio: string }>;
  requestAudioPermission(): Promise<{ camera: string; microphone: string; notifications: string; storage: string; photos: string; audio: string }>;
  openAppSettings(): Promise<void>;
  resolveMediaName(options: { name: string }): Promise<{ realName?: string }>;
  readClipboard(): Promise<{ value: string }>;
  writeClipboard(options: { value: string }): Promise<void>;
  addListener(eventName: 'onRecordComplete', listenerFunc: (info: { uri: string }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const OmniRecorder = registerPlugin<OmniRecorderPlugin>('OmniRecorder');
