package store.practicalthings.soloflow;

import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * The stock Capacitor client replaces every failed main-frame load with
 * server.errorPath. That file is a different origin, so it cannot show the
 * service worker cache. Android WebView also often reports a network error for
 * the first offline navigation before the worker is running. One reload gives
 * the worker a chance to answer with the cached shell.
 */
public class OfflineShellWebViewClient extends BridgeWebViewClient {

    private final Bridge bridge;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean usedRetry = false;
    private boolean reloadInFlight = false;
    private boolean lastLoadFailed = false;
    private int loadGeneration = 0;

    public OfflineShellWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
        lastLoadFailed = false;
        super.onPageStarted(view, url, favicon);
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        // onPageFinished also runs after a failed load. Only a load that did
        // not report an error should cancel the pending offline retry.
        if (!lastLoadFailed && url != null && !isErrorPage(url)) {
            usedRetry = false;
            reloadInFlight = false;
            loadGeneration++;
        }
        super.onPageFinished(view, url);
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (request != null && request.isForMainFrame()) {
            lastLoadFailed = true;
            if (retryOfflineNavigation(view, request.getUrl().toString())) return;
        }
        super.onReceivedError(view, request, error);
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        if (request != null && request.isForMainFrame() && errorResponse != null) {
            int status = errorResponse.getStatusCode();
            // Cached shells are HTTP 200. 503/504 on the main frame is an
            // offline miss; do not swap the WebView for the local error page
            // until the service-worker retry has also failed.
            if (status == 503 || status == 504) {
                lastLoadFailed = true;
                if (retryOfflineNavigation(view, request.getUrl().toString())) return;
            }
        }
        super.onReceivedHttpError(view, request, errorResponse);
    }

    private boolean retryOfflineNavigation(WebView view, String failedUrl) {
        if (failedUrl == null || isErrorPage(failedUrl)) return false;
        if (!failedUrl.startsWith("http://") && !failedUrl.startsWith("https://")) return false;
        if (reloadInFlight) return true;
        if (usedRetry) return false;
        usedRetry = true;
        reloadInFlight = true;
        final int generation = loadGeneration;
        handler.postDelayed(
            () -> {
                reloadInFlight = false;
                if (generation != loadGeneration) return;
                view.loadUrl(failedUrl);
            },
            250
        );
        return true;
    }

    private boolean isErrorPage(String url) {
        String errorUrl = bridge.getErrorUrl();
        return errorUrl != null && errorUrl.equals(url);
    }
}
