const fs = require('fs');
const file = 'src/components/tools/studio-recorder.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Rewrite acquireStream
const acquireStreamRegex = /const acquireStream = useCallback\(async \(\w+: RecorderMode\): Promise<MediaStream> => \{[\s\S]*?\}, \[screenQuality, screenFps, cameraFacing\]\);/m;
const newAcquireStream = \const acquireStream = useCallback(async (m: RecorderMode): Promise<MediaStream> => {
    if (!navigator.mediaDevices) {
      throw new Error("MediaDevices API not available (requires HTTPS or localhost).");
    }
    if (m === "screen") {
      const md = navigator.mediaDevices as any;
      if (!md.getDisplayMedia) throw new Error("Screen capture unsupported in this browser.");
      return md.getDisplayMedia({
        video: {
          width: { ideal: screenQuality === "4k" ? 3840 : screenQuality === "720p" ? 1280 : 1920 },
          frameRate: { ideal: screenFps }
        },
        audio: true
      });
    }
    if (m === "mic") {
      return navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    }
    return navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: Capacitor.isNativePlatform() ? 1280 : 1920 },
        facingMode: cameraFacing,
      },
      audio: true,
    });
  }, [screenQuality, screenFps, cameraFacing]);\;

code = code.replace(acquireStreamRegex, newAcquireStream);

// 2. Remove PiP from arm function
const armPiPRegex = /\/\/ Auto-open PiP for screen recording on web[\s\S]*?if \(!Capacitor.isNativePlatform\(\) && "documentPictureInPicture" in window\) \{[\s\S]*?\}\s*\}\s*const stream = await acquireStream\(m\);/m;
code = code.replace(armPiPRegex, 'const stream = await acquireStream(m);');

// 3. Remove beginRecording call from arm
const autoStartRegex = /if \(m === "screen" && !Capacitor\.isNativePlatform\(\)\) \{\s*\/\/ Auto-start recording!\s*beginRecording\(\);\s*\}/m;
code = code.replace(autoStartRegex, '');

// 4. Wrap MediaRecorder in try/catch in beginRecording
const mediaRecorderRegex = /const recorder = new MediaRecorder\(stream, options\);/m;
code = code.replace(mediaRecorderRegex, \let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (err) {
        console.warn("Failed with options, trying default:", err);
        recorder = new MediaRecorder(stream);
      }\);

fs.writeFileSync(file, code);
