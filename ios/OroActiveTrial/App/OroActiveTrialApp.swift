import SwiftUI
import WebKit

@main
struct OroActiveTrialApp: App {
    @StateObject private var session = TrialWebSession()

    var body: some Scene {
        WindowGroup {
            TrialRootView(session: session)
        }
    }
}

struct TrialRootView: View {
    @ObservedObject var session: TrialWebSession
    // A debug-only launch option makes the actual iOS views reproducible in simulator QA.
    @State private var showWidgets: Bool = {
        #if DEBUG
        return ProcessInfo.processInfo.arguments.contains("--widget-gallery")
        #else
        return false
        #endif
    }()

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("OroActive Prova").font(.caption.weight(.semibold))
                Spacer()
                if session.deferredDocumentCount > 0 {
                    Button(action: session.resumeSharedDocuments) {
                        Label("\(session.deferredDocumentCount)", systemImage: "tray.full")
                            .font(.caption.weight(.semibold)).frame(minWidth: 44, minHeight: 44)
                    }
                    .accessibilityLabel("Apri documenti in attesa: \(session.deferredDocumentCount)")
                }
                Button("Widget", systemImage: "square.grid.2x2") { showWidgets = true }
                    .font(.caption.weight(.semibold))
            }
            .foregroundStyle(Color.orange)
            .padding(.horizontal, 16).frame(minHeight: 44)
            .background(Color.black)
            ZStack(alignment: .top) {
                EmbeddedWebView(webView: session.webView)
                if session.loading { ProgressView().tint(.orange).padding(12) }
                if let error = session.errorMessage {
                    VStack(spacing: 18) {
                        Image(systemName: "wifi.exclamationmark").font(.largeTitle)
                        Text(error).multilineTextAlignment(.center)
                        Button("Riprova") { session.retry() }.buttonStyle(.borderedProminent)
                    }
                    .padding(28).frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black).foregroundStyle(.white)
                }
            }
            if let notice = session.navigationNotice {
                Text(notice).font(.caption).foregroundStyle(.white)
                    .padding(10).frame(maxWidth: .infinity).background(.black)
            }
        }
        .background(Color.black).tint(.orange)
        .onOpenURL { url in
            showWidgets = false
            session.open(url)
        }
        .sheet(isPresented: $showWidgets) { WidgetPreviewGallery() }
        .sheet(item: $session.popup, onDismiss: session.finishPopupDismissal) { popup in
            NavigationStack {
                EmbeddedWebView(webView: popup.webView)
                    .navigationTitle("Documento OroActive")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) {
                        Button("Chiudi") { session.popup = nil }
                    } }
            }
        }
        .sheet(item: $session.sharedFile, onDismiss: session.removeSharedFile) { file in
            ActivitySheet(url: file.url)
        }
    }
}

struct EmbeddedWebView: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ActivitySheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
