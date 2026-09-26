package com.omnitool.app;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "ZenoDeckNative";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(OmniRecorderPlugin.class);
        super.onCreate(savedInstanceState);
        
        if (bridge != null) {
            // Register stability listener to prevent OS from terminating the app
            // if Chromium's rendering process crashes or runs out of memory.
            bridge.addWebViewListener(new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    boolean didCrash = detail != null && detail.didCrash();
                    int rendererPriority = detail != null ? detail.rendererPriorityAtExit() : -1;
                    Log.e(TAG, "WebView render process exited: didCrash=" + didCrash + ", priority=" + rendererPriority);
                    
                    if (view != null) {
                        try {
                            view.destroy();
                        } catch (Exception ignored) {}
                    }
                    
                    // Recover gracefully on UI thread instead of crashing to home screen
                    runOnUiThread(() -> {
                        try {
                            recreate();
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to recreate activity on render process recovery", e);
                        }
                    });
                    
                    // Returning true tells Android OS that the app handled the crash
                    // and prevents the operating system from terminating the application.
                    return true;
                }
            });

            if (bridge.getWebView() != null) {
                WebView webView = bridge.getWebView();
                WebSettings settings = webView.getSettings();

                // Responsive Autofit & Display Normalization across all phone sizes
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setUseWideViewPort(true);
                settings.setLoadWithOverviewMode(true);
                settings.setTextZoom(100); // Prevent OS "Large Text" accessibility setting from distorting layouts
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);

                // Eliminate rubber-band stretching that distorts fixed headers and navigation
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
                webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
            }
        }
    }
}

