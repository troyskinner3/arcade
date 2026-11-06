// swift-tools-version:5.9
import PackageDescription
let package = Package(
  name: "NoodleKit",
  platforms: [.iOS(.v16), .macOS(.v13)],
  products: [.library(name: "NoodleKit", targets: ["NoodleKit"])],
  targets: [
    .target(name: "NoodleKit"),
    .executableTarget(name: "noodle-cli", dependencies: ["NoodleKit"]),
    .testTarget(name: "NoodleKitTests", dependencies: ["NoodleKit"]),
  ])
