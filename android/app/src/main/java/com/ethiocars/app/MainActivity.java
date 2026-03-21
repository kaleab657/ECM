package com.ethiocars.app;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        
        // Fix for Bug 1: Enforce true edge-to-edge drawing behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}