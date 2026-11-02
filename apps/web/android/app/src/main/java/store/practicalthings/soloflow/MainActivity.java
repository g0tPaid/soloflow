package store.practicalthings.soloflow;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void load() {
        super.load();
        if (bridge == null || bridge.getWebView() == null) return;
        // Bridge.loadWebView() already attached the default client and started
        // the first request. Swap the client, then load again so an offline
        // failure is retried for the service worker instead of being replaced
        // by the local error page.
        bridge.setWebViewClient(new OfflineShellWebViewClient(bridge));
        bridge.getWebView().post(() -> bridge.getWebView().loadUrl(bridge.getAppUrl()));
    }
}
