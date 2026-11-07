// Noodle for iPhone, first TestFlight build: the full Noodle web app in a native shell.
// Native pieces: the audio session (plays through the silent switch, records with the speaker on), microphone permission
// without the web prompt each time, and saving exported files (WAV, MIDI, video) through the share sheet.
// Next builds move the heavy and live parts (pitch reading, the note reader, live expression) into Swift (see ../NoodleKit).
import SwiftUI
import WebKit
import AVFoundation

let noodleURL = URL(string: "https://troyskinner3.github.io/arcade/noodle/")!

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
    web.load(URLRequest(url: noodleURL))
    return web
  }
  func updateUIView(_ web: WKWebView, context: Context) {}

  final class Coordinator: NSObject, WKUIDelegate, WKNavigationDelegate, WKDownloadDelegate {
    // microphone: the app already asked once (Info.plist text), so don't ask again inside the page
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
      decisionHandler(origin.host == noodleURL.host ? .grant : .prompt)
    }
    // exports: links with a download attribute (WAV, MIDI, video) become downloads, then go to the share sheet
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
      if action.shouldPerformDownload { decisionHandler(.download); return }
      if let u = action.request.url, action.targetFrame == nil, u.host != noodleURL.host { UIApplication.shared.open(u); decisionHandler(.cancel); return }
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
