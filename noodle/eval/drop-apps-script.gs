// Noodle take drop: paste into a new Apps Script project (script.google.com), set KEY, then
// Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone. Copy the web app URL.
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
