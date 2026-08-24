package com.omnitool.app.recorder;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

public class OmniRecordService extends Service {
    private final IBinder binder = new LocalBinder();
    private OmniScreenRecorder recorder;
    public static final String ACTION_STOP = "com.omnitool.app.STOP_RECORDING";

    public class LocalBinder extends Binder {
        public OmniRecordService getService() {
            return OmniRecordService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    private int width;
    private int height;
    private int dpi;
    private int bitrate;
    private int fps;
    private boolean internalAudio;
    private boolean mic;
    private String outputPath;
    private OmniScreenRecorder.Listener listener;

    public void setRecordingParams(int width, int height, int dpi, int bitrate, int fps, boolean internalAudio, boolean mic, String outputPath, OmniScreenRecorder.Listener listener) {
        this.width = width;
        this.height = height;
        this.dpi = dpi;
        this.bitrate = bitrate;
        this.fps = fps;
        this.internalAudio = internalAudio;
        this.mic = mic;
        this.outputPath = outputPath;
        this.listener = listener;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (ACTION_STOP.equals(intent.getAction())) {
            stopRecording();
            return START_NOT_STICKY;
        }
        
        createNotificationChannel();
        Intent stopIntent = new Intent(this, OmniRecordService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent pendingStopIntent = PendingIntent.getService(this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, "omni_recorder")
                .setContentTitle("Omni Tool Studio")
                .setContentText("Recording screen natively...")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .addAction(android.R.drawable.ic_media_pause, "STOP RECORDING", pendingStopIntent)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        } else {
            startForeground(1, notification);
        }

        if (intent != null && intent.hasExtra("resultCode")) {
            int resultCode = intent.getIntExtra("resultCode", 0);
            Intent resultData = intent.getParcelableExtra("resultData");
            startRecordingInternal(resultData, resultCode);
        }

        return START_NOT_STICKY;
    }

    private void startRecordingInternal(Intent resultData, int resultCode) {
        try {
            MediaProjectionManager projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            MediaProjection mediaProjection = projectionManager.getMediaProjection(resultCode, resultData);
            
            recorder = new OmniScreenRecorder(mediaProjection, width, height, dpi, bitrate, fps, internalAudio, mic, outputPath, new OmniScreenRecorder.Listener() {
                @Override
                public void onComplete(String path) {
                    stopForeground(true);
                    stopSelf();
                    if (listener != null) listener.onComplete(path);
                }

                @Override
                public void onError(String error) {
                    stopForeground(true);
                    stopSelf();
                    if (listener != null) listener.onError(error);
                }
            });
            recorder.start();
        } catch (Exception e) {
            stopForeground(true);
            stopSelf();
            if (listener != null) listener.onError(e.getMessage());
        }
    }

    public void stopRecording() {
        if (recorder != null) {
            recorder.stop();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    "omni_recorder",
                    "Screen Recorder Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
}
