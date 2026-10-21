import ActivityKit
import ExpoModulesCore
import Foundation
import WidgetKit

public class PebbleWidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PebbleWidgetBridge")

    Function("setSnapshot") { (json: String) in
      let defaults = UserDefaults(suiteName: "group.app.pebble.todo")
      defaults?.set(json, forKey: "snapshot")
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    AsyncFunction("startLiveActivity") { (json: String) in
      if #available(iOS 16.2, *) {
        try PebbleActivities.start(json: json)
      } else {
        throw BridgeError("Live Activities need iOS 16.2 or newer.")
      }
    }

    AsyncFunction("endLiveActivity") { () async in
      if #available(iOS 16.2, *) {
        await PebbleActivities.endAll()
      }
    }
  }
}

struct BridgeError: Error, LocalizedError {
  let message: String
  init(_ message: String) { self.message = message }
  var errorDescription: String? { message }
}

struct ActivityPayload: Codable {
  var todayDone: Int
  var todayOpen: Int
  var hat: String?
}

@available(iOS 16.2, *)
struct PebbleActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var todayDone: Int
    var todayOpen: Int
    var hat: String
  }
  var petName: String
}

@available(iOS 16.2, *)
enum PebbleActivities {
  static func start(json: String) throws {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      throw BridgeError("Live Activities are turned off on this iPhone.")
    }
    let payload = try JSONDecoder().decode(ActivityPayload.self, from: Data(json.utf8))
    let attributes = PebbleActivityAttributes(petName: "Pebble")
    let state = PebbleActivityAttributes.ContentState(
      todayDone: payload.todayDone,
      todayOpen: payload.todayOpen,
      hat: payload.hat ?? ""
    )
    if #available(iOS 16.2, *) {
      _ = try Activity.request(
        attributes: attributes,
        content: ActivityContent(state: state, staleDate: nil),
        pushType: nil
      )
    }
  }

  static func endAll() async {
    for activity in Activity<PebbleActivityAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}
