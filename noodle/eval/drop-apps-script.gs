// Noodle take drop: paste into a new Apps Script project (script.google.com), set KEY, then
// Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone. Copy the web app URL.
// Update: Deploy > Manage deployments > pencil > Version: New version > Deploy (the URL stays the same).
// Takes arrive in your Drive folder "Noodle takes": <id>.wav (the recording) and <id>.json (what Noodle heard + your edits).
const KEY = 'CHANGE-ME';

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.k !== KEY || !/^[\w.-]{1,120}$/.test(d.sid || '')) return ContentService.createTextOutput('no');
  const it = DriveApp.getFoldersByName('Noodle takes');
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder('Noodle takes');
  if (d.wav) folder.createFile(Utilities.newBlob(Utilities.base64Decode(d.wav), 'audio/wav', d.sid + '.wav'));
  if (d.meta) {
    const name = d.sid + '.json', text = JSON.stringify(d.meta), f = folder.getFilesByName(name);
    if (f.hasNext()) f.next().setContent(text); else folder.createFile(name, text, 'application/json');
  }
  return ContentService.createTextOutput('ok');
}

// Reading takes back (for scoring and training): ?k=KEY&list=1 lists the folder; ?k=KEY&get=<file name> returns one file as base64.
function doGet(e) {
  const p = e.parameter || {};
  if (p.k !== KEY) return ContentService.createTextOutput('no');
  const it = DriveApp.getFoldersByName('Noodle takes'); if (!it.hasNext()) return out_({files: []});
  const folder = it.next();
  if (p.list) {
    const files = [], f = folder.getFiles();
    while (f.hasNext()) { const x = f.next(); files.push({name: x.getName(), size: x.getSize(), modified: x.getLastUpdated().toISOString()}); }
    return out_({files: files});
  }
  if (p.get) {
    const f = folder.getFilesByName(p.get); if (!f.hasNext()) return out_({error: 'not found'});
    return out_({name: p.get, b64: Utilities.base64Encode(f.next().getBlob().getBytes())});
  }
  return out_({ok: true});
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
