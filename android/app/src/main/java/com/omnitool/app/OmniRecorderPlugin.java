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

import android.content.ContentResolver;
import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;

import androidx.activity.result.ActivityResult;

import com.omnitool.app.recorder.OmniRecordService;
import com.omnitool.app.recorder.OmniScreenRecorder;

import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;
import android.Manifest;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(
    name = "OmniRecorder",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        ),
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        ),
        @Permission(
            alias = "storage",
            strings = {
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            }
        )
    }
)
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

        if (internalAudio || mic) {
            if (getPermissionState("microphone") != PermissionState.GRANTED) {
                requestPermissionForAlias("microphone", call, "microphonePermsCallback");
                return;
            }
        }
        
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            if (getPermissionState("notifications") != PermissionState.GRANTED) {
                requestPermissionForAlias("notifications", call, "notificationsPermsCallback");
                return;
            }
        }

        launchScreenCaptureIntent(call);
    }

    @PermissionCallback
    private void notificationsPermsCallback(PluginCall call) {
        // We don't strictly reject if they deny notifications, but we try
        launchScreenCaptureIntent(call);
    }

    @PermissionCallback
    private void microphonePermsCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            if (android.os.Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
                requestPermissionForAlias("notifications", call, "notificationsPermsCallback");
            } else {
                launchScreenCaptureIntent(call);
            }
        } else {
            call.reject("Microphone permission is required for internal audio or mic recording");
        }
    }

    private void launchScreenCaptureIntent(PluginCall call) {
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
            serviceIntent.putExtra("resultCode", result.getResultCode());
            serviceIntent.putExtra("resultData", result.getData());
            
            isRecording = true;
            
            recordService.setRecordingParams(width, height, dpi, bitrate, fps, internalAudio, mic, currentOutputPath, 
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

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
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

    @PluginMethod
    public void resolveMediaName(PluginCall call) {
        String name = call.getString("name");
        if (name == null || name.isEmpty()) {
            call.resolve(new JSObject());
            return;
        }

        String idStr = name.replaceAll("\\.[^.]+$", "");
        if (!idStr.matches("^\\d+$")) {
            JSObject ret = new JSObject();
            ret.put("realName", name);
            call.resolve(ret);
            return;
        }

        try {
            long id = Long.parseLong(idStr);
            ContentResolver resolver = getContext().getContentResolver();

            // 1. Try Video MediaStore
            Uri videoUri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id);
            try (Cursor cursor = resolver.query(videoUri, new String[]{ MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.TITLE }, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIdx = cursor.getColumnIndex(MediaStore.Video.Media.DISPLAY_NAME);
                    if (nameIdx != -1) {
                        String realName = cursor.getString(nameIdx);
                        if (realName != null && !realName.isEmpty() && !realName.startsWith(idStr)) {
                            JSObject ret = new JSObject();
                            ret.put("realName", realName);
                            call.resolve(ret);
                            return;
                        }
                    }
                    int titleIdx = cursor.getColumnIndex(MediaStore.Video.Media.TITLE);
                    if (titleIdx != -1) {
                        String title = cursor.getString(titleIdx);
                        if (title != null && !title.isEmpty() && !title.startsWith(idStr)) {
                            String ext = name.contains(".") ? name.substring(name.lastIndexOf(".")) : ".mp4";
                            JSObject ret = new JSObject();
                            ret.put("realName", title + ext);
                            call.resolve(ret);
                            return;
                        }
                    }
                }
            }

            // 2. Try Audio MediaStore
            Uri audioUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
            try (Cursor cursor = resolver.query(audioUri, new String[]{ MediaStore.Audio.Media.DISPLAY_NAME, MediaStore.Audio.Media.TITLE }, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIdx = cursor.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME);
                    if (nameIdx != -1) {
                        String realName = cursor.getString(nameIdx);
                        if (realName != null && !realName.isEmpty() && !realName.startsWith(idStr)) {
                            JSObject ret = new JSObject();
                            ret.put("realName", realName);
                            call.resolve(ret);
                            return;
                        }
                    }
                }
            }

            // 3. Try Images MediaStore
            Uri imagesUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id);
            try (Cursor cursor = resolver.query(imagesUri, new String[]{ MediaStore.Images.Media.DISPLAY_NAME }, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIdx = cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME);
                    if (nameIdx != -1) {
                        String realName = cursor.getString(nameIdx);
                        if (realName != null && !realName.isEmpty() && !realName.startsWith(idStr)) {
                            JSObject ret = new JSObject();
                            ret.put("realName", realName);
                            call.resolve(ret);
                            return;
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Silently fall through
        }

        call.resolve(new JSObject());
    }

    @PluginMethod
    public void requestAllPermissions(PluginCall call) {
        List<String> aliases = new ArrayList<>();
        aliases.add("camera");
        aliases.add("microphone");
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            aliases.add("notifications");
        } else {
            aliases.add("storage");
        }
        requestPermissionForAliases(aliases.toArray(new String[0]), call, "allPermissionsCallback");
    }

    @PermissionCallback
    private void allPermissionsCallback(PluginCall call) {
        checkAllPermissions(call);
    }

    @PluginMethod
    public void checkAllPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("camera", getPermissionState("camera").toString().toLowerCase());
        ret.put("microphone", getPermissionState("microphone").toString().toLowerCase());

        if (android.os.Build.VERSION.SDK_INT >= 33) {
            ret.put("notifications", getPermissionState("notifications").toString().toLowerCase());
            ret.put("storage", "granted"); // Android 13+ Scoped Storage for app & Documents is always accessible
        } else {
            ret.put("notifications", "granted"); // Not restricted by runtime permission below API 33
            ret.put("storage", getPermissionState("storage").toString().toLowerCase());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open settings: " + e.getMessage());
        }
    }
}
