// Noodle for iPhone: the full Noodle web app in a native shell.
// The web app ships inside the app (the `web` folder, copied from ../noodle by sync-web.sh) and is served from noodle://app/,
// so it works offline and each release is a fixed version. If this iOS version doesn't let a bundled page use the
// microphone, the shell falls back to the live site.
// Native pieces: the audio session (plays through the silent switch, records with the speaker on), microphone permission
// without the web prompt each time, and saving exported files (WAV, MIDI, video) through the share sheet.
// Next builds move the heavy and live parts (pitch reading, the note reader, live expression) into Swift (see ../NoodleKit).
import SwiftUI
import WebKit
import AVFoundation

let liveURL = URL(string: "https://troyskinner3.github.io/arcade/noodle/")!
let bundledURL = URL(string: "noodle://app/index.html")!
let webRoot = Bundle.main.url(forResource: "web", withExtension: nil)   // folder reference in the app bundle

/* Serves the bundled web app at noodle://app/<path> */
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
  static let types = ["html": "text/html", "js": "text/javascript", "css": "text/css", "json": "application/json",
                      "woff2": "font/woff2", "png": "image/png", "svg": "image/svg+xml", "wav": "audio/wav", "txt": "text/plain"]
  func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
    guard let url = task.request.url, let root = webRoot else { task.didFailWithError(URLError(.fileDoesNotExist)); return }
    var path = url.path; if path.isEmpty || path == "/" { path = "/index.html" }
    let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
    guard file.path.hasPrefix(root.standardizedFileURL.path), let data = try? Data(contentsOf: file) else {   // nothing outside the web folder
      task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: [:])!); task.didReceive(Data()); task.didFinish(); return }
    let type = Self.types[file.pathExtension.lowercased()] ?? "application/octet-stream"
    task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                    headerFields: ["Content-Type": type, "Content-Length": String(data.count), "Cache-Control": "no-cache"])!)
    task.didReceive(data); task.didFinish()
  }
  func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

@main
struct NoodleWebApp: App {
  init() {
    let s = AVAudioSession.sharedInstance()
    try? s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothA2DP])
    try? s.setActive(true)
  }
  var body: some Scene {
    WindowGroup { NoodleWeb().ignoresSafeArea()   // the page handles the notch and home bar itself (viewport-fit=cover + safe-area insets)
     .background(Color(red: 0.07, green: 0.08, blue: 0.09)) }
  }
}

struct NoodleWeb: UIViewRepresentable {
  func makeCoordinator() -> Coordinator { Coordinator() }
  func makeUIView(context: Context) -> WKWebView {
    let cfg = WKWebViewConfiguration()
    cfg.allowsInlineMediaPlayback = true
    cfg.mediaTypesRequiringUserActionForPlayback = []
    cfg.applicationNameForUserAgent = "NoodleApp/1"          // lets the web app know it runs inside the app
    cfg.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: "noodle")
    let web = WKWebView(frame: .zero, configuration: cfg)
    web.uiDelegate = context.coordinator
    web.navigationDelegate = context.coordinator
    web.allowsBackForwardNavigationGestures = false
    web.scrollView.contentInsetAdjustmentBehavior = .never
    web.isOpaque = false
    web.backgroundColor = UIColor(red: 0.07, green: 0.08, blue: 0.09, alpha: 1)
    #if DEBUG
    if #available(iOS 16.4, *) { web.isInspectable = true }   // Safari > Develop can inspect it while testing
    #endif
    web.load(URLRequest(url: webRoot != nil ? bundledURL : liveURL))
    return web
  }
  func updateUIView(_ web: WKWebView, context: Context) {}

  final class Coordinator: NSObject, WKUIDelegate, WKNavigationDelegate, WKDownloadDelegate {
    // microphone: the app already asked once (Info.plist text), so don't ask again inside the page
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
      decisionHandler(origin.`protocol` == "noodle" || origin.host == liveURL.host ? .grant : .prompt)
    }
    // the bundled page must be allowed to use the microphone (a secure context); if not, use the live site instead
    private var checked = false
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
      guard !checked, webView.url?.scheme == "noodle" else { return }
      checked = true
      webView.evaluateJavaScript("window.isSecureContext && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)") { ok, _ in
        if (ok as? Bool) != true { webView.load(URLRequest(url: liveURL)) }
      }
    }
    // exports: links with a download attribute (WAV, MIDI, video) become downloads, then go to the share sheet
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
      if action.shouldPerformDownload { decisionHandler(.download); return }
      if let u = action.request.url, action.targetFrame == nil, u.scheme != "noodle", u.host != liveURL.host { UIApplication.shared.open(u); decisionHandler(.cancel); return }
      decisionHandler(.allow)
    }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
      decisionHandler(response.canShowMIMEType ? .allow : .download)
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    private var pending: URL?
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
      let url = FileManager.default.temporaryDirectory.appendingPathComponent(suggestedFilename)
      try? FileManager.default.removeItem(at: url); pending = url; completionHandler(url)
    }
    func downloadDidFinish(_ download: WKDownload) {
      guard let url = pending else { return }
      DispatchQueue.main.async {
        guard let root = UIApplication.shared.connectedScenes.compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first?.rootViewController else { return }
        let share = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        share.popoverPresentationController?.sourceView = root.view
        root.present(share, animated: true)
      }
    }
    // after a phone call or Siri, get the audio back
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }
  }
}
