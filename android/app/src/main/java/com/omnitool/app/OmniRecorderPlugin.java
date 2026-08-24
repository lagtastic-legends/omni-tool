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

        // Ensure audio is enabled
        hbRecorder.isAudioEnabled(true);
        hbRecorder.recordHDVideo(true);
        
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
        hbRecorder.stopScreenRecording();
        JSObject ret = new JSObject();
        ret.put("uri", "file://" + currentOutputPath);
        call.resolve(ret);
    }

    // HBRecorderListener overrides
    @Override
    public void HBRecorderOnStart() {
        Log.i("OmniRecorder", "Recording started");
    }

    @Override
    public void HBRecorderOnComplete() {
        Log.i("OmniRecorder", "Recording complete");
    }

    @Override
    public void HBRecorderOnError(int errorCode, String reason) {
        Log.e("OmniRecorder", "Error: " + reason);
    }

    @Override
    public void HBRecorderOnPause() {}

    @Override
    public void HBRecorderOnResume() {}
}
