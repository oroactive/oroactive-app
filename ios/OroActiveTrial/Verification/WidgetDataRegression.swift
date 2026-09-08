import Foundation

@main
struct WidgetDataRegression {
    static func main() {
        let now = Date(timeIntervalSince1970: 1_789_200_000)
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let current = GoldQuote(available: true, pricePerKg: 120_500.25, fetchedAt: formatter.string(from: now), stale: false)
        precondition(current.sanitized(at: now).pricePerKg == 120_500.25)
        precondition(!current.sanitized(at: now.addingTimeInterval(119)).stale)
        precondition(current.sanitized(at: now.addingTimeInterval(120)).stale)
        precondition(current.sanitized(at: now, forceStale: true).fetchedAt == current.fetchedAt)
        precondition(GoldQuote.unavailable.sanitized(at: now).pricePerKg == nil)
        for badPrice in [0.0, -1, Double.infinity, Double.nan] {
            var bad = current; bad.pricePerKg = badPrice
            precondition(!bad.sanitized(at: now).available)
        }
        var future = current; future.fetchedAt = formatter.string(from: now.addingTimeInterval(61))
        precondition(!future.sanitized(at: now).available)
        var wrongUnit = current; wrongUnit.unit = "oz"
        precondition(!wrongUnit.sanitized(at: now).available)
        var invalidDate = current; invalidDate.fetchedAt = "invalid"
        precondition(!invalidDate.sanitized(at: now).available)
        for action in OroActiveAction.allCases {
            precondition(OroActiveAction(url: action.url) == action)
            precondition(action.webURL.host == "app.oroactive.it")
            precondition(URLComponents(url: action.webURL, resolvingAgainstBaseURL: false)?.queryItems?.first?.value == action.rawValue)
        }
        for invalid in [
            "https://open?action=coins", "oroactive-trial://other?action=coins",
            "oroactive-trial://open?action=coins&action=gems", "oroactive-trial://open?action=delete-all",
            "oroactive-trial://user:password@open?action=coins", "oroactive-trial://open:443?action=coins",
            "oroactive-trial://open/private?action=coins", "oroactive-trial://open?action=coins%27"
        ] { precondition(OroActiveAction(url: URL(string: invalid)!) == nil) }
        print("Widget data: valid price, no fake values, expiry, failure timestamp and all six routes verified.")
    }
}
