import SwiftUI
import WidgetKit

struct WidgetPreviewGallery: View {
    @Environment(\.dismiss) private var dismiss
    @State private var quote = GoldQuote.unavailable
    @State private var refreshing = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("OroActive sulla tua Home")
                        .font(.title2.bold()).foregroundStyle(.white)
                    Text("Tieni premuta la schermata Home, scegli Modifica → Aggiungi widget e cerca OroActive Prova. Scegli uno dei tre formati.")
                        .font(.callout).foregroundStyle(.white.opacity(0.8))
                    preview("1 · Solo OroActive", style: .icon, width: 160, height: 160)
                    preview("2 · Quotazione e azioni rapide", style: .compact, width: 338, height: 170)
                    preview("3 · Quotazione e strumenti", style: .expanded, width: 338, height: 354)
                    Text("Le anteprime usano l’ultimo prezzo reale disponibile. Il widget indica l’ora della rilevazione; la frequenza di aggiornamento nella Home dipende da iOS e iPadOS.")
                        .font(.footnote).foregroundStyle(.white.opacity(0.7))
                    Text("Questa versione di prova accede allo stesso gestionale e agli stessi dati della web app: gli atti salvati sono reali.")
                        .font(.footnote).foregroundStyle(.orange)
                }
                .padding(20).frame(maxWidth: 600)
                .frame(maxWidth: .infinity)
            }
            .background(Color.black)
            .navigationTitle("Widget OroActive")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Chiudi") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button { Task { await refresh() } } label: {
                        if refreshing { ProgressView() } else { Image(systemName: "arrow.clockwise") }
                    }.disabled(refreshing).accessibilityLabel("Aggiorna quotazione")
                }
            }
            .task { await refresh() }
        }
        .preferredColorScheme(.dark)
    }

    private func preview(_ title: String, style: OroActivePreviewStyle, width: CGFloat, height: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.headline).foregroundStyle(.white)
            ViewThatFits(in: .horizontal) {
                OroActiveWidgetPreviewView(style: style, quote: quote)
                    .frame(width: width, height: height)
                OroActiveWidgetPreviewView(style: style, quote: quote)
                    .frame(width: 280, height: height)
            }
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(.orange.opacity(0.3)))
        }
    }

    private func refresh() async {
        refreshing = true
        quote = await GoldQuoteRepository.shared.refresh()
        WidgetCenter.shared.reloadAllTimelines()
        refreshing = false
    }
}
