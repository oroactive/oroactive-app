import SwiftUI
import WidgetKit

struct OroActiveWidgetEntry: TimelineEntry, Sendable {
    let date: Date
    let quote: GoldQuote
}

struct OroActiveTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> OroActiveWidgetEntry {
        OroActiveWidgetEntry(date: Date(), quote: .unavailable)
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (OroActiveWidgetEntry) -> Void) {
        guard !context.isPreview else {
            completion(OroActiveWidgetEntry(date: Date(), quote: .unavailable))
            return
        }
        Task {
            let quote = await GoldQuoteRepository.shared.cached()
            completion(OroActiveWidgetEntry(date: Date(), quote: quote))
        }
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<OroActiveWidgetEntry>) -> Void) {
        // The icon-only family needs no market request.
        guard context.family != .systemSmall else {
            completion(Timeline(entries: [OroActiveWidgetEntry(date: Date(), quote: .unavailable)], policy: .never))
            return
        }
        Task {
            let quote = await GoldQuoteRepository.shared.refresh()
            let now = Date()
            var entries = [OroActiveWidgetEntry(date: now, quote: quote.sanitized(at: now))]
            // Expiring the display is a local timeline entry, not a promise of another network refresh.
            if quote.available, !quote.stale, let expiry = quote.expiresAt, expiry > now {
                entries.append(OroActiveWidgetEntry(date: expiry, quote: quote.sanitized(at: expiry, forceStale: true)))
            }
            completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(15 * 60))))
        }
    }
}

private struct OroActiveWidgetEntryView: View {
    let entry: OroActiveWidgetEntry
    @Environment(\.widgetFamily) private var family

    private var style: OroActivePreviewStyle {
        switch family {
        case .systemSmall: .icon
        case .systemMedium: .compact
        default: .expanded
        }
    }

    var body: some View {
        OroActiveWidgetContent(style: style, quote: entry.quote)
            .padding(14)
            .containerBackground(for: .widget) { OroActiveWidgetPalette.background }
    }
}

struct OroActiveHomeWidget: Widget {
    static let kind = "OroActiveHomeWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: Self.kind, provider: OroActiveTimelineProvider()) { entry in
            OroActiveWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("OroActive")
        .description("Apri OroActive oppure consulta l'ultima quotazione con i collegamenti rapidi.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

@main
struct OroActiveWidgets: WidgetBundle {
    var body: some Widget { OroActiveHomeWidget() }
}
