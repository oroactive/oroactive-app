import SwiftUI
import WidgetKit

enum OroActivePreviewStyle: String, CaseIterable, Identifiable {
    case icon
    case compact
    case expanded

    var id: String { rawValue }
    var title: String {
        switch self {
        case .icon: "Solo OroActive"
        case .compact: "Quotazione e azioni"
        case .expanded: "Quotazione e collegamenti"
        }
    }
}

enum OroActiveWidgetPalette {
    static let gold = Color(red: 0.95, green: 0.70, blue: 0.31)
    static let background = LinearGradient(
        colors: [Color(red: 0.13, green: 0.10, blue: 0.07), Color(red: 0.025, green: 0.025, blue: 0.03)],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )

    static func inset(for style: OroActivePreviewStyle) -> CGFloat { style == .icon ? 8 : 14 }

    @ViewBuilder static func backdrop(for style: OroActivePreviewStyle) -> some View {
        if style == .icon { Color.black } else { background }
    }
}

/// The app and WidgetKit use exactly the same content and destination links.
struct OroActiveWidgetPreviewView: View {
    let style: OroActivePreviewStyle
    let quote: GoldQuote

    var body: some View {
        Group {
            if style == .icon {
                Link(destination: OroActiveAction.home.url) {
                    OroActiveWidgetContent(style: style, quote: quote)
                }
            } else {
                OroActiveWidgetContent(style: style, quote: quote)
            }
        }
            .padding(OroActiveWidgetPalette.inset(for: style))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background { OroActiveWidgetPalette.backdrop(for: style) }
            .clipShape(RoundedRectangle(cornerRadius: 26))
            .overlay {
                RoundedRectangle(cornerRadius: 26)
                    .strokeBorder(OroActiveWidgetPalette.gold.opacity(0.28), lineWidth: 1)
            }
            .environment(\.colorScheme, .dark)
    }
}

struct OroActiveWidgetContent: View {
    let style: OroActivePreviewStyle
    let quote: GoldQuote

    var body: some View {
        switch style {
        case .icon:
            Image("OroActiveLogo")
                .resizable()
                .widgetAccentedRenderingMode(.fullColor)
                .scaledToFit()
                .aspectRatio(1, contentMode: .fit)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityLabel("Apri OroActive")
                .widgetURL(OroActiveAction.home.url)
        case .compact:
            VStack(spacing: 9) {
                Link(destination: OroActiveAction.quote.url) {
                    GoldQuoteHeader(quote: quote, compact: true)
                }
                HStack(spacing: 10) {
                    OroActiveActionLink(action: .newAct, compact: true)
                    OroActiveActionLink(action: .aurum, compact: true)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .widgetURL(OroActiveAction.quote.url)
        case .expanded:
            VStack(spacing: 18) {
                Link(destination: OroActiveAction.quote.url) {
                    GoldQuoteHeader(quote: quote, compact: false)
                }
                Rectangle()
                    .fill(OroActiveWidgetPalette.gold.opacity(0.22))
                    .frame(height: 1)
                HStack(alignment: .top, spacing: 8) {
                    ForEach([OroActiveAction.newAct, .coins, .gems, .aurum]) { action in
                        OroActiveActionLink(action: action, compact: false)
                    }
                }
                Spacer(minLength: 0)
                HStack(spacing: 5) {
                    Image("OroActiveLogo")
                        .resizable()
                        .widgetAccentedRenderingMode(.fullColor)
                        .scaledToFit()
                        .frame(width: 22, height: 22)
                        .accessibilityHidden(true)
                    Text("OroActive")
                        .font(.caption.weight(.semibold))
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption.weight(.semibold))
                }
                .foregroundStyle(.white.opacity(0.7))
                .accessibilityHidden(true)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .widgetURL(OroActiveAction.quote.url)
        }
    }
}

private struct GoldQuoteHeader: View {
    let quote: GoldQuote
    let compact: Bool
    @Environment(\.widgetRenderingMode) private var renderingMode

    private var price: String {
        guard quote.available, let value = quote.pricePerKg else { return "—" }
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "it_IT")
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? "—"
    }

    private var timestamp: String {
        guard let date = quote.fetchedDate else { return "Apri Quotazione per aggiornare" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "it_IT")
        formatter.dateFormat = "dd/MM HH:mm:ss"
        return "BullionVault · \(formatter.string(from: date))"
    }

    private var status: String {
        guard quote.available else { return "Quotazione non disponibile" }
        return quote.stale ? "Dato non aggiornato" : "Ultima rilevazione"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 1 : 4) {
            HStack(spacing: 6) {
                Text("ORO PURO")
                    .font(.system(size: compact ? 10 : 12, weight: .bold))
                    .tracking(1)
                    .foregroundStyle(renderingMode == .fullColor ? OroActiveWidgetPalette.gold : .white)
                    .widgetAccentable()
                Spacer(minLength: 4)
                Text(status)
                    .font(.system(size: compact ? 9 : 10, weight: .medium))
                    .foregroundStyle(quote.stale ? Color.orange : Color.white.opacity(0.75))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text(price)
                    .font(.system(size: compact ? 27 : 36, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .foregroundStyle(.white)
                Text("€/kg")
                    .font(.system(size: compact ? 12 : 14, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.75))
            }
            Text(timestamp)
                .font(.system(size: compact ? 9 : 10))
                .foregroundStyle(.white.opacity(0.72))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(quote.available
            ? "Oro puro, \(price) euro al chilogrammo. \(status). \(timestamp). Apri Quotazione."
            : "Quotazione oro puro non disponibile. Apri Quotazione.")
    }
}

private struct OroActiveActionLink: View {
    let action: OroActiveAction
    let compact: Bool

    var body: some View {
        Link(destination: action.url) {
            Group {
                if compact {
                    HStack(spacing: 8) {
                        symbol(size: 28)
                        Text(action.title)
                            .font(.system(size: 13, weight: .semibold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 14))
                } else {
                    VStack(spacing: 9) {
                        symbol(size: 48)
                            .frame(width: 56, height: 56)
                            .background(.white.opacity(0.08), in: Circle())
                        Text(action.title)
                            .font(.system(size: 11, weight: .semibold))
                            .multilineTextAlignment(.center)
                            .lineLimit(3)
                            .minimumScaleFactor(0.85)
                            .frame(minHeight: 42, alignment: .top)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .top)
                }
            }
            .foregroundStyle(.white)
            .contentShape(Rectangle())
        }
        .accessibilityLabel(action.title)
    }

    @ViewBuilder private func symbol(size: CGFloat) -> some View {
        switch action {
        case .aurum:
            Image("AurumIcon")
                .resizable()
                .widgetAccentedRenderingMode(.fullColor)
                .scaledToFit()
                .frame(width: size, height: size)
                .accessibilityHidden(true)
        case .coins:
            ZStack {
                Circle().strokeBorder(OroActiveWidgetPalette.gold, lineWidth: 2)
                Circle().strokeBorder(OroActiveWidgetPalette.gold.opacity(0.5), lineWidth: 1).padding(4)
                Text("€").font(.system(size: size * 0.45, weight: .bold, design: .serif))
            }
            .frame(width: size * 0.8, height: size * 0.8)
            .foregroundStyle(OroActiveWidgetPalette.gold)
            .widgetAccentable()
            .frame(width: size, height: size)
            .accessibilityHidden(true)
        case .gems:
            GemstoneOutline()
                .stroke(OroActiveWidgetPalette.gold, style: StrokeStyle(lineWidth: 1.8, lineJoin: .round))
                .frame(width: size * 0.8, height: size * 0.8)
                .widgetAccentable()
                .frame(width: size, height: size)
                .accessibilityHidden(true)
        default:
            Image(systemName: "doc.badge.plus")
                .font(.system(size: size * 0.59, weight: .medium))
                .foregroundStyle(OroActiveWidgetPalette.gold)
                .widgetAccentable()
                .frame(width: size, height: size)
                .accessibilityHidden(true)
        }
    }
}

private struct GemstoneOutline: Shape {
    func path(in rect: CGRect) -> Path {
        let point: (CGFloat, CGFloat) -> CGPoint = { x, y in
            CGPoint(x: rect.minX + rect.width * x, y: rect.minY + rect.height * y)
        }
        var path = Path()
        path.move(to: point(0.23, 0.1))
        path.addLine(to: point(0.77, 0.1))
        path.addLine(to: point(0.98, 0.38))
        path.addLine(to: point(0.5, 0.94))
        path.addLine(to: point(0.02, 0.38))
        path.closeSubpath()
        path.move(to: point(0.02, 0.38))
        path.addLine(to: point(0.98, 0.38))
        path.move(to: point(0.23, 0.1))
        path.addLine(to: point(0.34, 0.38))
        path.addLine(to: point(0.5, 0.94))
        path.addLine(to: point(0.66, 0.38))
        path.addLine(to: point(0.77, 0.1))
        path.move(to: point(0.34, 0.38))
        path.addLine(to: point(0.5, 0.1))
        path.addLine(to: point(0.66, 0.38))
        return path
    }
}
