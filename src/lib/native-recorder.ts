import { PluginListenerHandle, registerPlugin } from '@capacitor/core';

export interface OmniRecorderPlugin {
  startRecording(options: { internalAudio: boolean; microphone: boolean; quality: string; fps: number }): Promise<void>;
  stopRecording(): Promise<{ uri: string }>;
  addListener(eventName: 'onRecordComplete', listenerFunc: (info: { uri: string }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const OmniRecorder = registerPlugin<OmniRecorderPlugin>('OmniRecorder');
