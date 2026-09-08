import Foundation

struct GoldQuote: Codable, Equatable, Sendable {
    static let maximumAge: TimeInterval = 120

    var available: Bool
    var pricePerKg: Double?
    var fetchedAt: String?
    var source: String = "BullionVault"
    var currency: String = "EUR"
    var unit: String = "kg"
    var stale: Bool

    static let unavailable = GoldQuote(available: false, pricePerKg: nil, fetchedAt: nil, stale: true)

    var fetchedDate: Date? {
        guard let fetchedAt else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: fetchedAt) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: fetchedAt)
    }

    var expiresAt: Date? { fetchedDate?.addingTimeInterval(Self.maximumAge) }

    /// Validate public market data before it is displayed or placed in the shared container.
    func sanitized(at now: Date = Date(), forceStale: Bool = false) -> GoldQuote {
        guard available, source == "BullionVault", currency == "EUR", unit == "kg",
              let pricePerKg, pricePerKg.isFinite, pricePerKg > 0,
              let date = fetchedDate, date.timeIntervalSince(now) <= 60 else { return .unavailable }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return GoldQuote(
            available: true,
            pricePerKg: pricePerKg,
            fetchedAt: formatter.string(from: date),
            stale: stale || forceStale || now.timeIntervalSince(date) >= Self.maximumAge
        )
    }
}

private struct CachedGoldQuote: Codable {
    let quote: GoldQuote
    let savedAt: Date
}

/// Contains public gold prices only. App login and customer records never enter this repository.
actor GoldQuoteRepository {
    static let shared = GoldQuoteRepository()
    static let appGroup = "group.it.oroactive.trial"
    static let endpoint = URL(string: "https://app.oroactive.it/api/widgets/gold")!
    private static let cacheKey = "public-gold-quote-v1"

    private let defaults: UserDefaults?

    init() {
        // Do not silently fall back to another preference domain if App Groups are unavailable.
        defaults = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroup) == nil
            ? nil : UserDefaults(suiteName: Self.appGroup)
    }

    func cached(at now: Date = Date()) -> GoldQuote {
        guard let data = defaults?.data(forKey: Self.cacheKey), data.count <= 16_384,
              let cached = try? JSONDecoder().decode(CachedGoldQuote.self, from: data),
              cached.savedAt.timeIntervalSince(now) <= 60 else { return .unavailable }
        return cached.quote.sanitized(at: now)
    }

    func refresh() async -> GoldQuote {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 8
        configuration.timeoutIntervalForResource = 8
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCredentialStorage = nil
        let session = URLSession(configuration: configuration, delegate: GoldQuoteRedirectPolicy(), delegateQueue: nil)
        defer { session.invalidateAndCancel() }
        var request = URLRequest(url: Self.endpoint)
        request.timeoutInterval = 8
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        do {
            let (bytes, response) = try await session.bytes(for: request)
            guard let response = response as? HTTPURLResponse,
                  response.statusCode == 200,
                  GoldQuoteRedirectPolicy.allows(response.url),
                  response.mimeType == "application/json",
                  response.expectedContentLength <= 16_384 else { return fallback() }
            var data = Data()
            for try await byte in bytes {
                guard data.count < 16_384 else { return fallback() }
                data.append(byte)
            }
            let quote = try JSONDecoder().decode(GoldQuote.self, from: data).sanitized()
            guard quote.available else { return fallback() }
            if let data = try? JSONEncoder().encode(CachedGoldQuote(quote: quote, savedAt: Date())) {
                defaults?.set(data, forKey: Self.cacheKey)
            }
            return quote
        } catch {
            return fallback()
        }
    }

    private func fallback() -> GoldQuote { cached().sanitized(forceStale: true) }
}

private final class GoldQuoteRedirectPolicy: NSObject, URLSessionTaskDelegate, Sendable {
    static func allows(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.scheme?.lowercased() == "https" && url.host?.lowercased() == "app.oroactive.it"
            && (url.port == nil || url.port == 443) && url.user == nil && url.password == nil
    }

    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest,
                    completionHandler: @escaping @Sendable (URLRequest?) -> Void) {
        completionHandler(Self.allows(request.url) ? request : nil)
    }
}
