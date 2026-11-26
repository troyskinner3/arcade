// Noodle for iPhone: the full Noodle web app in a native shell.
// The web app ships inside the app (the `web` folder, copied from ../noodle by sync-web.sh) and is served from noodle://app/,
// so it works offline and each release is a fixed version. If this iOS version doesn't let a bundled page use the
// microphone, the shell falls back to the live site.
// Native pieces: the audio session (plays through the silent switch, records with the speaker on), microphone permission
// without the web prompt each time, saving exported files (WAV, MIDI, video) through the share sheet, the Noodle Pro purchase (StoreKit 2),
// the lock screen's Now Playing and play/pause, and haptic taps.
// Next builds move the heavy and live parts (pitch reading, the note reader, live expression) into Swift (see ../NoodleKit).
import SwiftUI
import WebKit
import AVFoundation
import StoreKit
import MediaPlayer
import DeviceCheck
import CoreHaptics

let liveURL = URL(string: "https://troyskinner3.github.io/arcade/noodle/")!
let bundledURL = URL(string: "noodle://app/index.html")!
let webRoot = Bundle.main.url(forResource: "web", withExtension: nil)   // folder reference in the app bundle

/* Serves the bundled web app at noodle://app/<path> */
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
  static let types = ["html": "text/html", "js": "text/javascript", "css": "text/css", "json": "application/json",
                      "woff2": "font/woff2", "png": "image/png", "svg": "image/svg+xml", "wav": "audio/wav", "mp3": "audio/mpeg", "txt": "text/plain"]
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

/* Noodle Pro: a one-time, non-consumable purchase, kept for life. Ownership comes from the App Store's own record (Transaction.currentEntitlements),
   checked on every launch and whenever a transaction arrives (Ask to Buy approvals, purchases on another device), and sent to the page.
   The page asks for "buy", "restore" or "state". A yearly plan added later: put its product id in `ids` too; owning any of them is Pro. */
@MainActor
final class ProStore: NSObject, WKScriptMessageHandler {
  static let shared = ProStore()
  static let proID = "io.tuttii.Noodle.pro"            // create this In-App Purchase in App Store Connect (type: Non-Consumable)
  let ids: Set<String> = [ProStore.proID]
  weak var web: WKWebView?
  private var product: Product?
  private var owned = false
  private var updates: Task<Void, Never>?

  func start() {
    guard updates == nil else { return }
    updates = Task { for await r in Transaction.updates { if case .verified(let t) = r { await t.finish() }; await refresh() } }
    Task { await refresh(); await loadProduct(); send() }
  }
  private func loadProduct() async { if product == nil { product = try? await Product.products(for: [ProStore.proID]).first } }
  func refresh() async {
    var o = false
    for await r in Transaction.currentEntitlements { if case .verified(let t) = r, ids.contains(t.productID), t.revocationDate == nil { o = true } }
    owned = o; send()
  }
  private func js(_ s: String) -> String { let d = try? JSONSerialization.data(withJSONObject: [s]); return String(data: d ?? Data("[\"\"]".utf8), encoding: .utf8).map { String($0.dropFirst().dropLast()) } ?? "\"\"" }
  func send() { web?.evaluateJavaScript("window.noodlePro && window.noodlePro(\(owned), \(js(product?.displayPrice ?? "")))") }
  private func result(_ r: String) { web?.evaluateJavaScript("window.noodleProResult && window.noodleProResult(\(js(r)))") }
  func buy() async {
    await loadProduct()
    guard let p = product else { result("unavailable"); return }
    do {
      switch try await p.purchase() {
      case .success(let v):
        if case .verified(let t) = v { await t.finish(); await refresh(); result(owned ? "bought" : "failed") } else { result("failed") }
      case .pending: result("pending")
      case .userCancelled: result("cancelled")
      @unknown default: result("cancelled")
      }
    } catch { result("failed") }
  }
  func restore() async { try? await AppStore.sync(); await refresh(); result(owned ? "restored" : "none") }
  func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {   // WebKit calls this on the main thread
    let what = m.body as? String ?? ""
    Task {
      switch what {
      case "buy": await buy()
      case "restore": await restore()
      default: await refresh()
      }
    }
  }
}

/* The lock screen and Control Center (what's playing, play/pause) and haptic taps, asked for by the page ("noodleNative"). */
@MainActor
final class NativeBridge: NSObject, WKScriptMessageHandler {
  static let shared = NativeBridge()
  weak var web: WKWebView?
  private var started = false
  private let light = UIImpactFeedbackGenerator(style: .light)
  private let medium = UIImpactFeedbackGenerator(style: .medium)
  private let done = UINotificationFeedbackGenerator()
  /* Felt metronome: the page sends when the count-in starts and the beat length; every beat is scheduled ahead on the Taptic Engine
     (a stronger tap on each bar's first beat), so the timing doesn't depend on the page's timers. Stopped when recording ends. */
  private var hEngine: CHHapticEngine?
  private var hPlayer: CHHapticPatternPlayer?
  private func hapticEngine() -> CHHapticEngine? {
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return nil }
    if hEngine == nil, let e = try? CHHapticEngine() {
      e.playsHapticsOnly = true; e.isAutoShutdownEnabled = true
      e.resetHandler = { [weak e] in try? e?.start() }   // the engine restarts itself after an interruption
      hEngine = e
    }
    return hEngine
  }
  /* warm up when the record button is pressed, so starting the engine doesn't delay the first beats */
  private func metroWarm() { try? hapticEngine()?.start() }
  /* inMs: how long after sentMs (the page's clock time, ms) the count-in's first click is heard. Everything since then, the trip to
     the app and starting the engine (a few hundred ms at worst), is taken off, so the taps land on the clicks; beats whose time has
     already passed are left out. Without sentMs (an older page) it counts from when the message arrived. */
  /* the Taptic Engine takes a moment to move after it is told to, so each tap is sent this much early */
  private static let tapLead = 0.015
  private func metro(inMs: Double, sentMs: Double, beatMs: Double, beats: Int, perBar: Int, arrived: CFTimeInterval) {
    guard beatMs > 50, beats > 0, let e = hapticEngine() else { return }
    do {
      try e.start()
      let spent = sentMs > 0 ? max(0, Date().timeIntervalSince1970 - sentMs / 1000) : CACurrentMediaTime() - arrived   // since the page worked it out (the trip here included)
      let wait = inMs / 1000 - min(spent, 2) - Self.tapLead   // seconds from now to the first click
      let skip = wait < 0 ? Int((-wait / (beatMs / 1000)).rounded(.up)) : 0
      var evs: [CHHapticEvent] = []
      for i in skip..<min(beats, 4000) {
        let first = i % max(1, perBar) == 0
        evs.append(CHHapticEvent(eventType: .hapticTransient, parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: first ? 1.0 : 0.6),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: first ? 0.8 : 0.45)], relativeTime: Double(i - skip) * beatMs / 1000))
      }
      guard !evs.isEmpty else { return }
      try? hPlayer?.stop(atTime: CHHapticTimeImmediate)
      let p = try e.makePlayer(with: CHHapticPattern(events: evs, parameters: []))
      hPlayer = p
      let first = wait + Double(skip) * beatMs / 1000   // >= 0
      try p.start(atTime: e.currentTime + max(0, first))
    } catch {}
  }
  private func metroStop() { try? hPlayer?.stop(atTime: CHHapticTimeImmediate); hPlayer = nil }

  func start() {
    guard !started else { return }
    started = true
    let c = MPRemoteCommandCenter.shared()
    c.playCommand.addTarget { [weak self] _ in Task { @MainActor in self?.remote("play") }; return .success }
    c.pauseCommand.addTarget { [weak self] _ in Task { @MainActor in self?.remote("pause") }; return .success }
    c.togglePlayPauseCommand.addTarget { [weak self] _ in Task { @MainActor in self?.remote("toggle") }; return .success }
    UIApplication.shared.beginReceivingRemoteControlEvents()
  }
  private func remote(_ cmd: String) { web?.evaluateJavaScript("window.noodleRemote && window.noodleRemote('\(cmd)')") }
  /* Song links: https://<takes service>/s/<id> (universal link) or noodleapp://s/<id> (the listen page's button). Kept until the page says it is ready. */
  private var pageReady = false, pendingLink: URL?
  func openLink(_ u: URL) { pendingLink = u; deliverLink() }
  private func deliverLink() {
    guard pageReady, let u = pendingLink, let w = web else { return }
    pendingLink = nil
    let s = u.absoluteString.filter { $0.isLetter || $0.isNumber || "-_/:.?=#".contains($0) }   // only URL characters reach the page
    w.evaluateJavaScript("window.noodleOpenLink && window.noodleOpenLink('\(s)')")
  }
  func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {   // WebKit calls this on the main thread
    guard let d = m.body as? [String: Any], let type = d["type"] as? String else { return }
    switch type {
    case "haptic":
      switch d["style"] as? String {
      case "medium": medium.impactOccurred()
      case "success": done.notificationOccurred(.success)
      default: light.impactOccurred()
      }
    case "metro":
      metro(inMs: (d["inMs"] as? NSNumber)?.doubleValue ?? 0, sentMs: (d["sentMs"] as? NSNumber)?.doubleValue ?? 0, beatMs: (d["beatMs"] as? NSNumber)?.doubleValue ?? 0,
            beats: (d["beats"] as? NSNumber)?.intValue ?? 0, perBar: (d["perBar"] as? NSNumber)?.intValue ?? 4, arrived: CACurrentMediaTime())
    case "metroWarm": metroWarm()
    case "metroStop": metroStop()
    case "now":
      let playing = d["playing"] as? Bool ?? false
      var info: [String: Any] = [MPMediaItemPropertyTitle: d["title"] as? String ?? "Noodle", MPMediaItemPropertyArtist: "Noodle",
                                 MPNowPlayingInfoPropertyPlaybackRate: playing ? 1.0 : 0.0,
                                 MPNowPlayingInfoPropertyElapsedPlaybackTime: (d["pos"] as? NSNumber)?.doubleValue ?? 0]
      if let dur = (d["dur"] as? NSNumber)?.doubleValue { info[MPMediaItemPropertyPlaybackDuration] = dur }
      MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    case "ready": pageReady = true; deliverLink()
    case "dctoken":   // Apple DeviceCheck token for an invite (proves a real iPhone running Noodle); nil where unsupported (Simulator)
      guard DCDevice.current.isSupported else { web?.evaluateJavaScript("window.noodleDeviceToken && window.noodleDeviceToken(null)"); return }
      DCDevice.current.generateToken { data, _ in
        let t = data?.base64EncodedString() ?? ""
        Task { @MainActor in self.web?.evaluateJavaScript("window.noodleDeviceToken && window.noodleDeviceToken(\(t.isEmpty ? "null" : "'\(t)'"))") }
      }
    case "settings":   // the microphone was refused: open Noodle's page in Settings so it can be turned on
      if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) }
    case "rate":   // a happy moment (a song just shared): Apple decides whether the rating prompt shows (at most 3 times a year)
      if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
        AppStore.requestReview(in: scene)   // StoreKit, iOS 16+
      }
    default: break
    }
  }
}

@main
struct NoodleWebApp: App {
  init() {
    let s = AVAudioSession.sharedInstance()
    try? s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothA2DP])
    try? s.setAllowHapticsAndSystemSoundsDuringRecording(true)   // the felt metronome buzzes while the mic records
    try? s.setPreferredIOBufferDuration(0.005)   // the shortest audio buffer iOS allows: sound comes out sooner after a tap (owner: notes sounded late)
    try? s.setActive(true)
  }
  var body: some Scene {
    WindowGroup { NoodleWeb().ignoresSafeArea()   // the page handles the notch and home bar itself (viewport-fit=cover + safe-area insets)
     .onOpenURL { NativeBridge.shared.openLink($0) }   // a song link: remix it
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
    cfg.userContentController.add(ProStore.shared, name: "noodlePro")   // the page asks to buy / restore Noodle Pro
    cfg.userContentController.add(NativeBridge.shared, name: "noodleNative")   // lock-screen controls, haptic taps
    #if DEBUG
    // builds run from Xcode: More shows "Test as: Free / Pro / App Store", to try both versions without buying
    cfg.userContentController.addUserScript(WKUserScript(source: "window.NOODLE_DEV = true", injectionTime: .atDocumentStart, forMainFrameOnly: true))
    #endif
    let web = WKWebView(frame: .zero, configuration: cfg)
    web.uiDelegate = context.coordinator
    web.navigationDelegate = context.coordinator
    web.allowsBackForwardNavigationGestures = false
    web.scrollView.contentInsetAdjustmentBehavior = .never
    web.scrollView.bounces = false   // an app, not a page: nothing rubber-bands (the timeline frame stays put)
    web.scrollView.pinchGestureRecognizer?.isEnabled = false   // no pinch zoom: the page also says user-scalable=no in the app
    web.isOpaque = false
    web.backgroundColor = UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.07, green: 0.08, blue: 0.09, alpha: 1) : UIColor(red: 0.95, green: 0.95, blue: 0.96, alpha: 1) }   // behind the page while it loads: matches light or dark
    #if DEBUG
    if #available(iOS 16.4, *) { web.isInspectable = true }   // Safari > Develop can inspect it while testing
    #endif
    web.load(URLRequest(url: webRoot != nil ? bundledURL : liveURL))
    ProStore.shared.web = web; ProStore.shared.start()
    NativeBridge.shared.web = web; NativeBridge.shared.start()
    return web
  }
  func updateUIView(_ web: WKWebView, context: Context) {}

  final class Coordinator: NSObject, WKUIDelegate, WKNavigationDelegate, WKDownloadDelegate {
    // microphone: the app already asked once (Info.plist text), so don't ask again inside the page
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
      // Noodle's own pages only: the bundled copy (noodle://), or the live site under /arcade/noodle/ (the frame's URL; an origin has no path).
      // Any other page on github.io gets the normal question (security review, Nov 2026).
      let p = frame.request.url?.path ?? "", live = origin.host == liveURL.host && (p == liveURL.path || p.hasPrefix(liveURL.path + "/"))
      decisionHandler(origin.`protocol` == "noodle" || live ? .grant : .prompt)
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
      // email, phone, App Store and other app links (Help and contact, Redeem in the App Store) open in their own app, never inside Noodle
      if let u = action.request.url, let sch = u.scheme?.lowercased(), !["http", "https", "noodle", "about", "blob", "data"].contains(sch) {
        UIApplication.shared.open(u); decisionHandler(.cancel); return }
      if let u = action.request.url, action.targetFrame == nil, u.scheme != "noodle" { UIApplication.shared.open(u); decisionHandler(.cancel); return }   // new-window links (Privacy, the App Store) open in Safari, including our own site
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
    // if the page can't load: ignore loads that were only cancelled or replaced; if the live site fails, use the bundled copy;
    // otherwise say so, with the error code (so a report can be diagnosed) and a Try again link that reloads the bundled app
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { loadFailed(webView, error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { loadFailed(webView, error) }
    private func loadFailed(_ webView: WKWebView, _ error: Error) {
      let e = error as NSError
      if e.domain == NSURLErrorDomain && e.code == NSURLErrorCancelled { return }
      if e.domain == "WebKitErrorDomain" && (e.code == 102 || e.code == 204) { return }   // frame load interrupted (downloads), plug-in handled load
      let failed = (e.userInfo[NSURLErrorFailingURLErrorKey] as? URL) ?? webView.url
      if let sch = failed?.scheme?.lowercased(), !["http", "https", "noodle"].contains(sch) { return }   // a link meant for another app: nothing to reload
      if webRoot != nil && failed?.scheme != "noodle" { webView.load(URLRequest(url: bundledURL)); return }
      let retry = webRoot != nil ? bundledURL.absoluteString : liveURL.absoluteString
      let msg = webRoot != nil ? "Noodle couldn’t open." : "Noodle couldn’t load. Check your connection."
      webView.loadHTMLString("<meta name='viewport' content='width=device-width'><body style='background:#121417;color:#e9ebef;font:17px -apple-system;padding:48px 24px'><h2>Something went wrong</h2><p>\(msg)</p><p><a href='\(retry)' style='color:#ffb547'>Try again</a></p><p style='color:#8a9099;font-size:13px'>\(e.domain) \(e.code)</p></body>", baseURL: nil)
    }
    // after a phone call or Siri, get the audio back
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }
  }
}
