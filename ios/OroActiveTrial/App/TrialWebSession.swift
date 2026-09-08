import Combine
import Foundation
import SwiftUI
import WebKit
import UIKit

struct TrialPopup: Identifiable {
    let id = UUID()
    let webView: WKWebView
}

struct TrialSharedFile: Identifiable {
    let id = UUID()
    let url: URL
}

/// The web session stays inside WKWebView. No login token is copied to native storage or widgets.
@MainActor
final class TrialWebSession: NSObject, ObservableObject {
    @Published var loading = true
    @Published var errorMessage: String?
    @Published var navigationNotice: String?
    @Published var popup: TrialPopup?
    @Published var sharedFile: TrialSharedFile?
    @Published private(set) var deferredDocumentCount = 0
    let webView: WKWebView
    private var action: String?
    private var bridgeTask: Task<Void, Never>?
    private var bridgeGeneration = 0
    private var lastSharedURL: URL?
    private var pendingSharedURL: URL?
    private var queuedSharedURLs: [URL] = []
    private var queuePresentationPaused = false
    private var downloadURLs: [ObjectIdentifier: URL] = [:]
    private static let origin = "https://app.oroactive.it"

    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        config.applicationNameForUserAgent = "OroActiveTrial/1.0"
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.allowsBackForwardNavigationGestures = false
        config.userContentController.add(self, name: "oroactivePrint")
        config.userContentController.addUserScript(WKUserScript(source: """
            if (location.origin === 'https://app.oroactive.it') {
                window.print = () => window.webkit.messageHandlers.oroactivePrint.postMessage('print');
            }
            """, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        webView.load(URLRequest(url: URL(string: Self.origin)!, cachePolicy: .reloadIgnoringLocalCacheData))
    }

    func open(_ url: URL) {
        guard let route = OroActiveAction(url: url) else { return }
        let value = route.rawValue
        // A widget opens its destination visibly, including when a document was left open.
        queuePresentationPaused = sharedFile != nil || pendingSharedURL != nil || !queuedSharedURLs.isEmpty
        if let url = pendingSharedURL { queuedSharedURLs.append(url); pendingSharedURL = nil }
        deferredDocumentCount = queuedSharedURLs.count
        popup = nil
        if sharedFile != nil { sharedFile = nil }
        action = value
        bridgeGeneration += 1
        bridgeTask?.cancel()
        bridgeTask = nil
        deliverAction()
    }

    func retry() {
        errorMessage = nil
        loading = true
        let url = URL(string: Self.origin)!
        webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData))
    }

    private func deliverAction() {
        guard bridgeTask == nil || bridgeTask?.isCancelled == true, let value = action else { return }
        let generation = bridgeGeneration
        bridgeTask = Task { [weak self] in
            guard let self else { return }
            defer { if self.bridgeGeneration == generation { self.bridgeTask = nil } }
            // A bounded handoff waits for the remote app to load. Its dispatcher then owns login waiting.
            for _ in 0..<40 {
                if Task.isCancelled { return }
                guard self.action == value, Self.isAppURL(self.webView.url) else { return }
                let script = "window.OroActiveNavigation ? window.OroActiveNavigation.openAction('\(value)') : null"
                if let result = try? await self.webView.evaluateJavaScript(script) as? [String: Any],
                   let status = result["status"] as? String {
                    guard !Task.isCancelled, self.bridgeGeneration == generation, self.action == value else { return }
                    self.action = nil
                    switch status {
                    case "opened": self.navigationNotice = nil
                    case "pending": self.navigationNotice = nil // The login UI remains the authority.
                    default: self.navigationNotice = "La funzione non è disponibile per questo accesso."
                    }
                    return
                }
                try? await Task.sleep(for: .milliseconds(500))
            }
            guard !Task.isCancelled, self.bridgeGeneration == generation, self.action == value else { return }
            self.navigationNotice = "Aggiorna OroActive e riprova il collegamento del widget."
        }
    }

    private static func isAppURL(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.scheme == "https" && url.host == "app.oroactive.it"
            && (url.port == nil || url.port == 443) && url.user == nil && url.password == nil
    }

    func removeSharedFile() {
        if let url = lastSharedURL { try? FileManager.default.removeItem(at: url) }
        lastSharedURL = nil
        if !queuePresentationPaused, !queuedSharedURLs.isEmpty {
            let next = queuedSharedURLs.removeFirst()
            deferredDocumentCount = queuedSharedURLs.count
            showShareSheet(next)
        }
        if queuedSharedURLs.isEmpty, downloadURLs.isEmpty { queuePresentationPaused = false }
    }

    func resumeSharedDocuments() {
        guard lastSharedURL == nil, pendingSharedURL == nil, !queuedSharedURLs.isEmpty else { return }
        queuePresentationPaused = false
        let next = queuedSharedURLs.removeFirst()
        deferredDocumentCount = queuedSharedURLs.count
        showShareSheet(next)
    }

    private func showShareSheet(_ url: URL) {
        guard !queuePresentationPaused, lastSharedURL == nil, pendingSharedURL == nil else {
            queuedSharedURLs.append(url)
            deferredDocumentCount = queuedSharedURLs.count
            return
        }
        if popup != nil {
            pendingSharedURL = url
            popup = nil
        } else { presentSharedFile(url) }
    }

    private func presentSharedFile(_ url: URL) {
        lastSharedURL = url
        sharedFile = TrialSharedFile(url: url)
    }

    func finishPopupDismissal() {
        if let url = pendingSharedURL {
            pendingSharedURL = nil
            presentSharedFile(url)
        }
    }

    private static func isExternalLink(_ url: URL) -> Bool {
        ["https", "mailto", "tel", "whatsapp"].contains(url.scheme ?? "") && url.user == nil && url.password == nil
    }

    private func currentPresenter() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        var controller = scene?.windows.first(where: \.isKeyWindow)?.rootViewController
        while let presented = controller?.presentedViewController { controller = presented }
        return controller
    }
}

extension TrialWebSession: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        if webView === self.webView { loading = true; errorMessage = nil }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if webView === self.webView { loading = false; errorMessage = nil; deliverAction() }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        if webView === self.webView {
            loading = false
            errorMessage = "OroActive non è raggiungibile. Controlla la connessione e riprova."
        }
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        self.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        if webView === self.webView {
            loading = false
            errorMessage = "La pagina è stata interrotta. Riaprila per continuare; verifica eventuali dati non salvati."
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if Self.isAppURL(url) || url.absoluteString.hasPrefix("blob:https://app.oroactive.it/") || url.absoluteString == "about:blank" {
            decisionHandler(navigationAction.shouldPerformDownload ? .download : .allow)
            return
        }
        // Third-party frames cannot acquire the app bridge, and outgoing links open only after a user tap.
        if navigationAction.targetFrame?.isMainFrame == false { decisionHandler(.allow); return }
        if navigationAction.targetFrame == nil, navigationAction.sourceFrame.isMainFrame,
           Self.isAppURL(navigationAction.sourceFrame.request.url), Self.isExternalLink(url) {
            decisionHandler(.allow) // The new-window delegate opens this link outside the app.
            return
        }
        if navigationAction.navigationType == .linkActivated, Self.isExternalLink(url) {
            UIApplication.shared.open(url)
        }
        decisionHandler(.cancel)
    }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping @MainActor @Sendable (WKNavigationResponsePolicy) -> Void) {
        let mime = response.response.mimeType ?? ""
        decisionHandler((response.isForMainFrame && mime == "application/pdf") || !response.canShowMIMEType ? .download : .allow)
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }
}

extension TrialWebSession: WKUIDelegate {
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard navigationAction.targetFrame == nil, let url = navigationAction.request.url else { return nil }
        guard Self.isAppURL(url) || url.absoluteString.hasPrefix("blob:https://app.oroactive.it/")
                || url.absoluteString == "about:blank" else {
            if navigationAction.sourceFrame.isMainFrame, Self.isAppURL(navigationAction.sourceFrame.request.url),
               Self.isExternalLink(url) { UIApplication.shared.open(url) }
            return nil
        }
        let child = WKWebView(frame: .zero, configuration: configuration)
        child.navigationDelegate = self
        child.uiDelegate = self
        popup = TrialPopup(webView: child)
        return child
    }
    func webViewDidClose(_ webView: WKWebView) {
        if popup?.webView === webView { popup = nil }
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping @MainActor @Sendable () -> Void) {
        guard let presenter = currentPresenter() else { completionHandler(); return }
        let alert = UIAlertController(title: "OroActive", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        presenter.present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping @MainActor @Sendable (Bool) -> Void) {
        guard let presenter = currentPresenter() else { completionHandler(false); return }
        let alert = UIAlertController(title: "OroActive", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Annulla", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "Conferma", style: .default) { _ in completionHandler(true) })
        presenter.present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping @MainActor @Sendable (String?) -> Void) {
        guard let presenter = currentPresenter() else { completionHandler(nil); return }
        let alert = UIAlertController(title: "OroActive", message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Annulla", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "Conferma", style: .default) { [weak alert] _ in
            completionHandler(alert?.textFields?.first?.text ?? "")
        })
        presenter.present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                 decisionHandler: @escaping @MainActor @Sendable (WKPermissionDecision) -> Void) {
        decisionHandler(origin.protocol == "https" && origin.host == "app.oroactive.it" ? .prompt : .deny)
    }
}

extension TrialWebSession: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "oroactivePrint", message.frameInfo.isMainFrame,
              Self.isAppURL(message.frameInfo.request.url), let presenter = currentPresenter() else { return }
        let controller = UIPrintInteractionController.shared
        controller.printFormatter = (message.webView ?? webView).viewPrintFormatter()
        if UIDevice.current.userInterfaceIdiom == .pad {
            controller.present(from: CGRect(x: presenter.view.bounds.midX, y: 0, width: 1, height: 1),
                               in: presenter.view, animated: true)
        } else { controller.present(animated: true) }
    }
}

extension TrialWebSession: WKDownloadDelegate {
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping @MainActor @Sendable (URL?) -> Void) {
        let safeName = URL(fileURLWithPath: suggestedFilename).lastPathComponent
        let name = safeName.isEmpty ? "documento-oroactive.pdf" : safeName
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID().uuidString)-\(name)")
        downloadURLs[ObjectIdentifier(download)] = file
        completionHandler(file)
    }
    func downloadDidFinish(_ download: WKDownload) {
        guard let url = downloadURLs.removeValue(forKey: ObjectIdentifier(download)) else { return }
        try? FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)
        loading = false
        showShareSheet(url)
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        if let url = downloadURLs.removeValue(forKey: ObjectIdentifier(download)) { try? FileManager.default.removeItem(at: url) }
        loading = false
        navigationNotice = "Download non completato. Riprova dalla pagina del documento."
    }
}
