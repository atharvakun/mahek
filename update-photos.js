// Scans the photos folder and writes photos/list.js for the page.
// Run via update-photos.cmd (double-click) or: node update-photos.js
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'photos');
const all = fs.readdirSync(dir);
const isImg = n => /\.(jpe?g|png|webp|gif|avif)$/i.test(n);
const isVid = n => /\.(mp4|webm|mov|m4v)$/i.test(n);
const nat = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function jpegDims(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
function jpegOrient(b) {
  const idx = b.indexOf('Exif'); if (idx < 0) return 1;
  const t = idx + 6, le = b.toString('ascii', t, t + 2) === 'II';
  const r16 = o => le ? b.readUInt16LE(o) : b.readUInt16BE(o), r32 = o => le ? b.readUInt32LE(o) : b.readUInt32BE(o);
  try { const ifd = t + r32(t + 4), n = r16(ifd); for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12; if (r16(e) === 0x0112) return r16(e + 8); } } catch (e) { }
  return 1;
}
function dims(file) {
  const b = fs.readFileSync(file);
  if (/\.jpe?g$/i.test(file)) { const d = jpegDims(b); if (!d) return null; const o = jpegOrient(b); return o >= 5 ? [d[1], d[0]] : d; }
  if (/\.png$/i.test(file)) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  return null;
}

const media = all.filter(n => isImg(n) || isVid(n)).sort(nat);
const list = media.map(n => {
  const item = { src: 'photos/' + n };
  if (isVid(n)) item.video = true;
  else { const d = dims(path.join(dir, n)); if (d) { item.w = d[0]; item.h = d[1]; } }
  return item;
});
fs.writeFileSync(path.join(dir, 'list.js'), 'window.PHOTOS=' + JSON.stringify(list) + ';\n');
console.log('Found ' + list.filter(x => !x.video).length + ' photos and ' + list.filter(x => x.video).length + ' video(s). list.js updated.');
const heic = all.filter(n => /\.heic$/i.test(n));
if (heic.length) console.log('Skipped ' + heic.length + ' HEIC file(s): browsers cannot show HEIC. Export them as JPG and add again.');
