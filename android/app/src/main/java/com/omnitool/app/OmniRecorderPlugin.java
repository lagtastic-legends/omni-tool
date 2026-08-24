package com.omnitool.app;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.media.projection.MediaProjectionManager;
import android.os.Environment;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import androidx.activity.result.ActivityResult;

import com.omnitool.app.recorder.OmniRecordService;
import com.omnitool.app.recorder.OmniScreenRecorder;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(name = "OmniRecorder")
public class OmniRecorderPlugin extends Plugin {
    private PluginCall startCall;
    private PluginCall stopCall;
    private String currentOutputPath;
    private OmniRecordService recordService;
    private boolean isBound = false;
    private boolean isRecording = false;

    private int width = 720;
    private int height = 1280;
    private int dpi = 320;
    private int bitrate = 12000000;
    private int fps = 30;
    private boolean internalAudio = true;
    private boolean mic = false;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName className, IBinder service) {
            OmniRecordService.LocalBinder binder = (OmniRecordService.LocalBinder) service;
            recordService = binder.getService();
            isBound = true;
        }

        @Override
        public void onServiceDisconnected(ComponentName arg0) {
            isBound = false;
        }
    };

    @Override
    public void load() {
        super.load();
        Intent intent = new Intent(getContext(), OmniRecordService.class);
        getContext().bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (isBound) {
            getContext().unbindService(serviceConnection);
            isBound = false;
        }
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
        if (isRecording) {
            call.reject("Already recording");
            return;
        }
        if (!isBound || recordService == null) {
            call.reject("Service not bound yet");
            return;
        }
        this.startCall = call;

        String quality = call.getString("quality", "1080p");
        this.fps = call.getInt("fps", 30);
        this.internalAudio = Boolean.TRUE.equals(call.getBoolean("internalAudio", true));
        this.mic = Boolean.TRUE.equals(call.getBoolean("microphone", false));
        
        WindowManager wm = (WindowManager) getContext().getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics metrics = new DisplayMetrics();
        wm.getDefaultDisplay().getRealMetrics(metrics);
        this.width = metrics.widthPixels;
        this.height = metrics.heightPixels;
        this.dpi = metrics.densityDpi;
        
        if (quality.equals("4k")) {
            this.bitrate = 24000000;
        } else {
            this.bitrate = 12000000;
        }

        MediaProjectionManager projectionManager = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        Intent permissionIntent = projectionManager.createScreenCaptureIntent();
        startActivityForResult(call, permissionIntent, "screenCaptureResult");
    }

    @ActivityCallback
    private void screenCaptureResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK) {
            File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_MOVIES);
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            currentOutputPath = new File(dir, "OmniScreen_" + timeStamp + ".mp4").getAbsolutePath();
            
            Intent serviceIntent = new Intent(getContext(), OmniRecordService.class);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION.SDK_INT) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
            isRecording = true;
            
            recordService.startRecording(
                result.getData(), result.getResultCode(), 
                width, height, dpi, bitrate, fps, internalAudio, mic, currentOutputPath, 
                new OmniScreenRecorder.Listener() {
                    @Override
                    public void onComplete(String path) {
                        isRecording = false;
                        JSObject ret = new JSObject();
                        ret.put("uri", "file://" + path);
                        if (stopCall != null) {
                            stopCall.resolve(ret);
                            stopCall = null;
                        } else {
                            notifyListeners("onRecordComplete", ret);
                        }
                    }

                    @Override
                    public void onError(String error) {
                        isRecording = false;
                        if (stopCall != null) {
                            stopCall.reject(error);
                            stopCall = null;
                        }
                    }
                }
            );
            
            call.resolve();
        } else {
            call.reject("User cancelled permission");
        }
    }

    @PluginMethod
    public void stopRecording(PluginCall call) {
        if (!isRecording) {
            call.reject("Not recording");
            return;
        }
        this.stopCall = call;
        if (recordService != null) {
            recordService.stopRecording();
        }
    }
}
