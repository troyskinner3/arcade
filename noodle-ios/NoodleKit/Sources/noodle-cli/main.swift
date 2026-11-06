import Foundation; import NoodleKit
// usage: noodle-cli frames <file.wav>   -> JSON [[t,db,conf,midi],...] like the web app's frame dump
let a = CommandLine.arguments
if a.count >= 3 && a[1] == "frames" {
  let (x, sr) = try readWav(URL(fileURLWithPath: a[2])); let t0 = Date()
  let fr = PitchTracker().frames(x, sr: sr)
  FileHandle.standardError.write("frames \(fr.count) in \(String(format: "%.2f", Date().timeIntervalSince(t0))) s\n".data(using: .utf8)!)
  print("[" + fr.map { String(format: "[%.3f,%.2f,%.3f,%.3f]", $0.t, $0.db, $0.conf, $0.midi) }.joined(separator: ",") + "]")
}
// usage: noodle-cli notes <list.txt> <root>  -> JSON {file: {notes:[[t0,t1,midi]]}} for the eval scripts
if a.count >= 4 && a[1] == "notes" {
  let files = try String(contentsOfFile: a[2], encoding: .utf8).split(separator: "\n").map(String.init); var parts: [String] = []
  for f in files { let (x, sr) = try readWav(URL(fileURLWithPath: a[3] + "/" + f)); let ns = NoteReader().notes(x, sr: sr)
    parts.append("\"\(f)\":{\"notes\":[" + ns.map { String(format: "[%.3f,%.3f,%.2f]", $0.t0, $0.t1, $0.midi) }.joined(separator: ",") + "]}") }
  print("{" + parts.joined(separator: ",") + "}")
}
