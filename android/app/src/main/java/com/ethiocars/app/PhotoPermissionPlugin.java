package com.ethiocars.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "PhotoPermission",
    permissions = {
        @Permission(
            alias = "readMedia",
            strings = { "android.permission.READ_MEDIA_IMAGES" }
        ),
        @Permission(
            alias = "readStorage",
            strings = { "android.permission.READ_EXTERNAL_STORAGE" }
        )
    }
)
public class PhotoPermissionPlugin extends Plugin {

    private static final String PREFS_NAME = "photo_permission_prefs";
    private static final String KEY_HAS_ASKED = "has_asked_photo_permission";

    /**
     * Check the current photo/media permission status.
     * Returns: { status: "granted" | "prompt" | "denied" | "permanentlyDenied" }
     */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        String permission = getRequiredPermission();
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(), permission
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();

        if (granted) {
            result.put("status", "granted");
        } else {
            boolean shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
                getActivity(), permission
            );
            boolean hasAskedBefore = getPrefs().getBoolean(KEY_HAS_ASKED, false);

            if (!hasAskedBefore) {
                // Never asked → can prompt
                result.put("status", "prompt");
            } else if (shouldShowRationale) {
                // Denied once but can ask again
                result.put("status", "denied");
            } else {
                // Denied with "Don't ask again" checked
                result.put("status", "permanentlyDenied");
            }
        }

        result.put("permission", permission);
        call.resolve(result);
    }

    /**
     * Request the photo/media permission — triggers the REAL Android system dialog.
     * Android 13+ (API 33+) → READ_MEDIA_IMAGES
     * Android <13             → READ_EXTERNAL_STORAGE
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        String permission = getRequiredPermission();
        boolean alreadyGranted = ContextCompat.checkSelfPermission(
            getContext(), permission
        ) == PackageManager.PERMISSION_GRANTED;

        if (alreadyGranted) {
            JSObject result = new JSObject();
            result.put("status", "granted");
            call.resolve(result);
            return;
        }

        // Mark that we have asked at least once
        getPrefs().edit().putBoolean(KEY_HAS_ASKED, true).apply();

        // Use the correct alias based on API level
        String alias = Build.VERSION.SDK_INT >= 33 ? "readMedia" : "readStorage";
        requestPermissionForAlias(alias, call, "handlePermissionResult");
    }

    /**
     * Callback invoked after the user responds to the permission dialog.
     */
    @PermissionCallback
    private void handlePermissionResult(PluginCall call) {
        String permission = getRequiredPermission();
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(), permission
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();

        if (granted) {
            result.put("status", "granted");
        } else {
            boolean shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
                getActivity(), permission
            );
            // If rationale should be shown → user denied but can ask again
            // If rationale should NOT be shown → user chose "Don't ask again"
            result.put("status", shouldShowRationale ? "denied" : "permanentlyDenied");
        }

        call.resolve(result);
    }

    /**
     * Open the system app settings page so the user can manually enable photo access.
     */
    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open settings: " + e.getMessage());
        }
    }

    /**
     * Returns the correct Android permission string based on API level.
     */
    private String getRequiredPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            return "android.permission.READ_MEDIA_IMAGES";
        }
        return "android.permission.READ_EXTERNAL_STORAGE";
    }

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS_NAME, 0);
    }
}
