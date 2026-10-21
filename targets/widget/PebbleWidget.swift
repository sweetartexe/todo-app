import SwiftUI
import WidgetKit
import ActivityKit

struct PebbleSnapshot: Codable {
  var coins: Int = 0
  var todayDone: Int = 0
  var todayOpen: Int = 0
  var hat: String? = nil
  var background: String? = nil
  var plant: String? = nil
  var furniture: String? = nil
  var displayName: String = "Pebble"
}

struct PebbleActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var todayDone: Int
    var todayOpen: Int
    var hat: String
  }
  var petName: String
}

struct PetEntry: TimelineEntry {
  let date: Date
  let snapshot: PebbleSnapshot
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> PetEntry {
    PetEntry(date: Date(), snapshot: PebbleSnapshot())
  }

  func getSnapshot(in context: Context, completion: @escaping (PetEntry) -> Void) {
    completion(PetEntry(date: Date(), snapshot: load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PetEntry>) -> Void) {
    let entry = PetEntry(date: Date(), snapshot: load())
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }

  func load() -> PebbleSnapshot {
    let defaults = UserDefaults(suiteName: "group.app.pebble.todo")
    guard let raw = defaults?.string(forKey: "snapshot"),
          let data = raw.data(using: .utf8),
          let snapshot = try? JSONDecoder().decode(PebbleSnapshot.self, from: data) else {
      return PebbleSnapshot()
    }
    return snapshot
  }
}

struct PetFace: View {
  var hat: String?
  var size: CGFloat

  var body: some View {
    ZStack {
      Circle().fill(Color(red: 1.0, green: 0.71, blue: 0.54))
      HStack(spacing: size * 0.18) {
        Circle().frame(width: size * 0.12, height: size * 0.12)
        Circle().frame(width: size * 0.12, height: size * 0.12)
      }
      .offset(y: -size * 0.06)
      .foregroundStyle(Color(red: 0.23, green: 0.15, blue: 0.09))
      hatShape.offset(y: -size * 0.42)
    }
    .frame(width: size, height: size)
  }

  @ViewBuilder
  var hatShape: some View {
    switch hat {
    case "hat-party":
      Triangle().fill(Color(red: 1, green: 0.42, blue: 0.29)).frame(width: size * 0.46, height: size * 0.36)
    case "hat-crown":
      Triangle().fill(Color(red: 0.94, green: 0.71, blue: 0.16)).frame(width: size * 0.55, height: size * 0.28)
    case "hat-beanie":
      Capsule().fill(Color(red: 0.24, green: 0.56, blue: 0.79)).frame(width: size * 0.55, height: size * 0.28)
    case "hat-sprout":
      Circle().fill(Color(red: 0.24, green: 0.61, blue: 0.29)).frame(width: size * 0.22, height: size * 0.22)
    default:
      EmptyView()
    }
  }
}

struct Triangle: Shape {
  func path(in rect: CGRect) -> Path {
    var path = Path()
    path.move(to: CGPoint(x: rect.midX, y: rect.minY))
    path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
    path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
    path.closeSubpath()
    return path
  }
}

struct PebbleHomeWidget: Widget {
  let kind = "PebbleWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      WidgetFace(snapshot: entry.snapshot)
        .containerBackground(Color(red: 1, green: 0.965, blue: 0.918), for: .widget)
    }
    .configurationDisplayName("Pebble")
    .description("Your pet, and how many tasks are left.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
  }
}

struct WidgetFace: View {
  @Environment(\.widgetFamily) var family
  var snapshot: PebbleSnapshot

  var body: some View {
    switch family {
    case .accessoryInline:
      Text("Pebble · \(snapshot.todayOpen) to do")
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 0) {
          PetFace(hat: snapshot.hat, size: 22)
          Text("\(snapshot.todayOpen)").font(.headline)
        }
      }
    case .accessoryRectangular:
      HStack {
        PetFace(hat: snapshot.hat, size: 36)
        VStack(alignment: .leading) {
          Text("Pebble").font(.headline)
          Text("\(snapshot.todayOpen) to do").font(.caption)
        }
      }
    default:
      HStack(spacing: 10) {
        PetFace(hat: snapshot.hat, size: family == .systemMedium ? 86 : 72)
        VStack(alignment: .leading, spacing: 4) {
          Text("Pebble").font(.headline)
          Text("\(snapshot.todayOpen) to do").font(.title3).bold()
          Text("\(snapshot.todayDone) done today").font(.caption).foregroundStyle(.secondary)
        }
        Spacer(minLength: 0)
      }
      .padding(4)
    }
  }
}

struct PebbleLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PebbleActivityAttributes.self) { context in
      HStack {
        PetFace(hat: context.state.hat, size: 48)
        VStack(alignment: .leading) {
          Text("Pebble").font(.headline)
          Text("\(context.state.todayOpen) still to do")
          Text("\(context.state.todayDone) done today").font(.caption)
        }
        Spacer()
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          PetFace(hat: context.state.hat, size: 36)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text("\(context.state.todayOpen)").font(.title2).bold()
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text("\(context.state.todayDone) done today")
        }
      } compactLeading: {
        PetFace(hat: context.state.hat, size: 18)
      } compactTrailing: {
        Text("\(context.state.todayOpen)")
      } minimal: {
        PetFace(hat: context.state.hat, size: 14)
      }
    }
  }
}

@main
struct PebbleWidgets: WidgetBundle {
  var body: some Widget {
    PebbleHomeWidget()
    PebbleLiveActivity()
  }
}
