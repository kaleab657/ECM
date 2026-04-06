package com.ethiocars.app;

import android.os.Bundle;
import android.view.WindowManager;
import android.os.Build;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import android.content.res.Resources;
import android.view.View;
import android.view.ActionMode;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhotoPermissionPlugin.class);
        setTheme(R.style.AppTheme_NoActionBar);
        super.onCreate(savedInstanceState);
        
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();

            // Hide native Android WebView scrollbars to make the app look fully native
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setScrollBarStyle(android.view.View.SCROLLBARS_INSIDE_OVERLAY);
            
            // WEBVIEW FIX FOR COPY/PASTE NATIVE MENU
            webView.setLongClickable(true);

            // ===== DARK MODE / CAB THEME FIX =====
            // Enable algorithmic darkening so the WebView (and its CAB toolbar)
            // follows the system dark/light theme — just like Telegram.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ : use the new API
                webView.getSettings().setAlgorithmicDarkeningAllowed(true);
            } else if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(webView.getSettings(), true);
            } else if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                // Older devices: follow system theme
                WebSettingsCompat.setForceDark(webView.getSettings(), WebSettingsCompat.FORCE_DARK_AUTO);
            }
        }
        // Fix for Bug 1: Enforce true edge-to-edge drawing behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Fix text selection toolbar dark overlay — prevent Android from dimming
        // the screen behind the floating Cut/Copy/Paste toolbar
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
        getWindow().getDecorView().setSystemUiVisibility(
            getWindow().getDecorView().getSystemUiVisibility()
        );
    }

    @Override
    public void onActionModeStarted(ActionMode mode) {
        super.onActionModeStarted(mode);
        // FORCE-REMOVE THE BACKGROUND BAR:
        // Find the system bar that causes the black background block and hide it.
        // This keeps the floating bubble (Real toolbar) but deletes the ugly background.
        int identifier = Resources.getSystem().getIdentifier("action_context_bar", "id", "android");
        View v = getWindow().getDecorView().findViewById(identifier);
        if (v != null) {
            v.setBackground(null);
            v.setVisibility(View.GONE);
        }
    }
}