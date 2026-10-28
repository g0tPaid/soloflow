package com.soloflow.app;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final long SYNC_INTERVAL_MS = 20_000L;
    private final Handler syncHandler = new Handler(Looper.getMainLooper());
    private final Runnable syncTick = new Runnable() {
        @Override
        public void run() {
            WebView webView = getBridge() == null ? null : getBridge().getWebView();
            if (webView != null) {
                webView.evaluateJavascript(
                    "try{window.dispatchEvent(new Event('online'));}catch(e){}",
                    null
                );
            }
            syncHandler.postDelayed(this, SYNC_INTERVAL_MS);
        }
    };

    @Override
    public void onResume() {
        super.onResume();
        syncHandler.removeCallbacks(syncTick);
        syncHandler.post(syncTick);
    }

    @Override
    public void onPause() {
        syncHandler.removeCallbacks(syncTick);
        super.onPause();
    }
}
