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

        return START_NOT_STICKY;
    }

    public void startRecording(Intent resultData, int resultCode, int width, int height, int dpi, int bitrate, int fps, boolean internalAudio, boolean mic, String outputPath, OmniScreenRecorder.Listener listener) {
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
