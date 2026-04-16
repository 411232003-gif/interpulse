package com.interpalse

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Lock to portrait mode for better user experience
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

        webView = findViewById(R.id.webView)
        
        // Configure WebView settings
        configureWebView()
        
        // Load the URL
        webView.loadUrl("https://localhost:3005")
        
        // Handle back button press
        setupBackButton()
    }

    private fun configureWebView() {
        // Enable JavaScript
        webView.settings.javaScriptEnabled = true
        
        // Enable DOM Storage for login persistence
        webView.settings.domStorageEnabled = true
        
        // Enable localStorage and sessionStorage
        webView.settings.databaseEnabled = true
        
        // Enable cache for offline functionality
        webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
        webView.settings.setAppCacheEnabled(true)
        
        // Enable zoom controls
        webView.settings.setSupportZoom(true)
        webView.settings.builtInZoomControls = true
        webView.settings.displayZoomControls = false // Hide zoom controls
        
        // Enable smooth scrolling
        webView.settings.setRenderPriority(WebSettings.RenderPriority.HIGH)
        webView.settings.cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
        
        // Enable mixed content (if needed for local development)
        webView.settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        
        // Set WebViewClient to handle page navigation
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // You can add loading completion logic here
            }
            
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                // Handle external links - open in browser instead of WebView
                if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                    if (url.contains("localhost:3005")) {
                        // Keep local URLs in WebView
                        return false
                    } else {
                        // Open external URLs in browser
                        view?.context?.startActivity(
                            android.content.Intent(
                                android.content.Intent.ACTION_VIEW,
                                android.net.Uri.parse(url)
                            )
                        )
                        return true
                    }
                }
                return false
            }
        }
        
        // Set WebChromeClient for better UI elements
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                // You can show progress bar here if needed
                super.onProgressChanged(view, newProgress)
            }
        }
    }

    private fun setupBackButton() {
        // Override back button to handle WebView navigation
        webView.setOnKeyListener { v, keyCode, event ->
            if (keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_DOWN) {
                if (webView.canGoBack()) {
                    webView.goBack()
                    return@setOnKeyListener true
                }
            }
            false
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // Handle back button press
        if (keyCode == KeyEvent.KEYCODE_BACK && event?.action == KeyEvent.ACTION_DOWN) {
            if (webView.canGoBack()) {
                webView.goBack()
                return true
            } else {
                // Show exit confirmation dialog
                showExitDialog()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun showExitDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Keluar dari InterPulse")
            .setMessage("Apakah Anda yakin ingin keluar dari aplikasi?")
            .setPositiveButton("Ya") { _, _ ->
                finish()
            }
            .setNegativeButton("Tidak", null)
            .show()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        super.onDestroy()
        webView.destroy()
    }
}
