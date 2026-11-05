package com.canopyos.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final int FILE_REQUEST = 10;
    private SharedPreferences prefs;
    private LinearLayout root;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String server;
    private boolean failed;
    private final int green = Color.rgb(52, 211, 153);

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("canopyos", MODE_PRIVATE);
        server = prefs.getString("server", "");
        if (validServer(server)) openServer(); else setup();
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private void screen() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(3, 20, 16));
        root.setPadding(dp(20), dp(16), dp(20), dp(16));
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(dp(20) + insets.getSystemWindowInsetLeft(),
                dp(16) + insets.getSystemWindowInsetTop(),
                dp(20) + insets.getSystemWindowInsetRight(),
                dp(16) + insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(root);
    }

    private TextView text(String value, int size) {
        TextView t = new TextView(this);
        t.setText(value); t.setTextColor(Color.WHITE); t.setTextSize(size);
        t.setPadding(0, dp(10), 0, dp(10)); root.addView(t); return t;
    }

    private Button button(String value, Runnable action) {
        Button b = new Button(this);
        b.setText(value); b.setTextColor(Color.BLACK); b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(green));
        b.setOnClickListener(v -> action.run()); root.addView(b); return b;
    }

    static boolean local(Uri u) {
        String host = u.getHost();
        return "localhost".equals(host) || "127.0.0.1".equals(host) || "[::1]".equals(host);
    }

    static boolean validServer(String value) {
        try {
            Uri u = Uri.parse(value);
            String path = u.getPath();
            return u.isHierarchical() && u.getHost() != null && !u.getHost().isEmpty()
                && u.getUserInfo() == null && u.getQuery() == null && u.getFragment() == null
                && (path == null || path.isEmpty() || "/".equals(path))
                && ("https".equals(u.getScheme()) || (BuildConfig.DEBUG && "http".equals(u.getScheme()) && local(u)));
        } catch (RuntimeException e) { return false; }
    }

    private boolean sameOrigin(Uri u) {
        Uri origin = Uri.parse(server);
        return origin.getScheme().equals(u.getScheme()) && origin.getHost().equals(u.getHost()) && origin.getPort() == u.getPort();
    }

    private void destroyWeb() {
        if (web != null) {
            web.stopLoading(); web.loadUrl("about:blank"); web.destroy(); web = null;
        }
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
    }

    private void setup() {
        destroyWeb(); screen();
        text("CanopyOS", 30);
        text("Connecter votre instance", 22);
        text("Saisissez l’adresse HTTPS du site CanopyOS que vous utilisez. Le serveur et son API doivent être en ligne.", 16);
        EditText address = new EditText(this);
        address.setSingleLine(true);
        address.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        address.setTextColor(Color.WHITE); address.setHintTextColor(Color.LTGRAY);
        address.setHint("https://votre-instance.example"); address.setContentDescription("Adresse du serveur");
        address.setText(server); root.addView(address);
        TextView error = text("", 16); error.setTextColor(Color.rgb(252, 165, 165));
        button("Ouvrir CanopyOS", () -> {
            String next = address.getText().toString().trim();
            if (!validServer(next)) { error.setText("Adresse HTTPS valide requise, sans identifiants ni chemin."); return; }
            next = next.replaceAll("/+$", "");
            if (!next.equals(server)) {
                server = next;
                WebStorage.getInstance().deleteAllData();
                CookieManager.getInstance().removeAllCookies(done -> {
                    prefs.edit().putString("server", server).apply(); openServer();
                });
            } else openServer();
        });
        text("Vos données de culture restent sur votre serveur. Cette bêta n’est pas une application hors ligne.", 14);
    }

    private void openServer() {
        destroyWeb(); failed = false; screen();
        LinearLayout bar = new LinearLayout(this);
        TextView title = new TextView(this); title.setText("CanopyOS"); title.setTextColor(green); title.setTextSize(20);
        bar.addView(title, new LinearLayout.LayoutParams(0, dp(48), 1));
        Button change = new Button(this); change.setText("Serveur");
        change.setContentDescription("Changer de serveur");
        change.setOnClickListener(v -> setup()); bar.addView(change); root.addView(bar);
        TextView status = text("Chargement…", 14);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(3, 20, 16));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (sameOrigin(url)) return false;
                if (request.hasGesture() && "https".equals(url.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); } catch (ActivityNotFoundException ignored) { }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!failed) status.setVisibility(View.GONE);
            }
            private void unavailable() {
                failed = true;
                status.setText("Serveur indisponible. Vérifiez l’adresse et votre connexion.");
                status.setVisibility(View.VISIBLE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) unavailable();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame()) unavailable();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, FILE_REQUEST);
                } catch (ActivityNotFoundException e) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        root.addView(web, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));
        web.loadUrl(server + "/plants");
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == FILE_REQUEST && fileCallback != null) {
            Uri[] selected = WebChromeClient.FileChooserParams.parseResult(result, data);
            // Accept only granted content-provider URIs, never file:// or app-private paths.
            if (selected != null) for (Uri uri : selected) {
                if (!"content".equals(uri.getScheme())) { selected = null; break; }
            }
            fileCallback.onReceiveValue(selected); fileCallback = null;
        }
    }
    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() { destroyWeb(); super.onDestroy(); }
}
