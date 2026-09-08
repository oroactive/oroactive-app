import Foundation

enum OroActiveAction: String, CaseIterable, Identifiable, Sendable {
    case home
    case quote
    case newAct = "new-act"
    case coins
    case gems
    case aurum

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "OroActive"
        case .quote: "Quotazione"
        case .newAct: "Nuovo Atto"
        case .coins: "Elenco Monete"
        case .gems: "Laboratorio Gemmologico"
        case .aurum: "Aurum"
        }
    }

    var url: URL {
        var components = URLComponents()
        components.scheme = "oroactive-trial"
        components.host = "open"
        components.queryItems = [URLQueryItem(name: "action", value: rawValue)]
        return components.url!
    }

    var webURL: URL {
        var components = URLComponents(string: "https://app.oroactive.it/")!
        components.queryItems = [URLQueryItem(name: "action", value: rawValue)]
        return components.url!
    }

    init?(url: URL) {
        guard url.scheme?.lowercased() == "oroactive-trial",
              url.host?.lowercased() == "open",
              url.path.isEmpty || url.path == "/",
              url.user == nil, url.password == nil, url.port == nil,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return nil }
        let actions = (components.queryItems ?? []).filter { $0.name == "action" }
        guard actions.count == 1, let value = actions.first?.value else { return nil }
        self.init(rawValue: value)
    }
}
