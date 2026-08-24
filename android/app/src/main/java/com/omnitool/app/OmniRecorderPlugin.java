package com.omnitool.app;

import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.content.Context;
import android.os.Build;
import android.os.Environment;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import androidx.activity.result.ActivityResult;

import com.hbisoft.hbrecorder.HBRecorder;
import com.hbisoft.hbrecorder.HBRecorderListener;

import java.io.File;
import java.util.Date;
import java.text.SimpleDateFormat;
import java.util.Locale;

@CapacitorPlugin(name = "OmniRecorder")
public class OmniRecorderPlugin extends Plugin implements HBRecorderListener {
    private HBRecorder hbRecorder;
    private PluginCall startCall;
    private PluginCall stopCall;
    private String currentOutputPath;

    @Override
    public void load() {
        super.load();
        hbRecorder = new HBRecorder(getContext(), this);
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
        if (hbRecorder.isBusyRecording()) {
            call.reject("Already recording");
            return;
        }
        this.startCall = call;

        // Custom Quality Settings
        String quality = call.getString("quality", "1080p");
        int fps = call.getInt("fps", 30);
        
        hbRecorder.enableCustomSettings();
        hbRecorder.setVideoFrameRate(fps);
        
        if (quality.equals("4k")) {
            hbRecorder.setVideoBitrate(24000000); // 24 Mbps for 4K
        } else {
            hbRecorder.setVideoBitrate(12000000); // 12 Mbps for 1080p
        }

        // Notification Settings
        hbRecorder.setNotificationTitle("Omni Tool Studio");
        hbRecorder.setNotificationDescription("Recording screen natively...");

        // Ensure audio is enabled
        hbRecorder.isAudioEnabled(true);
        
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
            
            hbRecorder.setOutputPath(dir.getAbsolutePath());
            hbRecorder.setFileName("OmniScreen_" + timeStamp);
            hbRecorder.startScreenRecording(result.getData(), result.getResultCode());
            
            call.resolve();
        } else {
            call.reject("User cancelled permission");
        }
    }

    @PluginMethod
    public void stopRecording(PluginCall call) {
        if (!hbRecorder.isBusyRecording()) {
            call.reject("Not recording");
            return;
        }
        this.stopCall = call;
        hbRecorder.stopScreenRecording();
        // Will resolve in HBRecorderOnComplete
    }

    // HBRecorderListener overrides
    @Override
    public void HBRecorderOnStart() {
        Log.i("OmniRecorder", "Recording started");
    }

    @Override
    public void HBRecorderOnComplete() {
        Log.i("OmniRecorder", "Recording complete");
        JSObject ret = new JSObject();
        ret.put("uri", "file://" + currentOutputPath);
        if (this.stopCall != null) {
            this.stopCall.resolve(ret);
            this.stopCall = null;
        } else {
            // Stopped via notification
            notifyListeners("onRecordComplete", ret);
        }
    }

    @Override
    public void HBRecorderOnError(int errorCode, String reason) {
        Log.e("OmniRecorder", "Error: " + reason);
        if (this.stopCall != null) {
            this.stopCall.reject(reason);
            this.stopCall = null;
        }
    }

    @Override
    public void HBRecorderOnPause() {}

    @Override
    public void HBRecorderOnResume() {}
}
