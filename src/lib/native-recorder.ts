import { registerPlugin } from '@capacitor/core';

export interface OmniRecorderPlugin {
  startRecording(options: { internalAudio: boolean; microphone: boolean }): Promise<void>;
  stopRecording(): Promise<{ uri: string }>;
}

export const OmniRecorder = registerPlugin<OmniRecorderPlugin>('OmniRecorder');
