import { PluginListenerHandle, registerPlugin } from '@capacitor/core';

export interface OmniRecorderPlugin {
  startRecording(options: { internalAudio: boolean; microphone: boolean; quality: string; fps: number }): Promise<void>;
  stopRecording(): Promise<{ uri: string }>;
  requestPermissions(): Promise<any>;
  checkPermissions(): Promise<any>;
  addListener(eventName: 'onRecordComplete', listenerFunc: (info: { uri: string }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const OmniRecorder = registerPlugin<OmniRecorderPlugin>('OmniRecorder');
