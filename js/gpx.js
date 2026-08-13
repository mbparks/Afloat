const unesc=s=>String(s||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const gpxEsc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export function parseGpx(text){
  const src=String(text||''); const pts=[]; const re=/<(?:rtept|trkpt)\b[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:rtept|trkpt)>/gi; let m,i=0;
  while((m=re.exec(src))){const name=(m[3].match(/<name>([\s\S]*?)<\/name>/i)||[])[1];const lat=Number(m[1]),lon=Number(m[2]);if(Number.isFinite(lat)&&Number.isFinite(lon))pts.push({name:unesc(name)||`Waypoint ${++i}`,lat,lon});}
  if(!pts.length){const self=/<(?:rtept|trkpt)\b[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*\/>/gi;while((m=self.exec(src))){const lat=Number(m[1]),lon=Number(m[2]);if(Number.isFinite(lat)&&Number.isFinite(lon))pts.push({name:`Waypoint ${++i}`,lat,lon});}}
  const routeName=unesc((src.match(/<(?:rte|trk)>[\s\S]*?<name>([\s\S]*?)<\/name>/i)||[])[1]||'Imported GPX route');
  return {name:routeName,points:pts};
}
export function exportGpx(name,points=[]){
  const rows=points.map(p=>`    <rtept lat="${Number(p.lat).toFixed(6)}" lon="${Number(p.lon).toFixed(6)}"><name>${gpxEsc(p.name||'Waypoint')}</name></rtept>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="AFLOAT" xmlns="http://www.topografix.com/GPX/1/1">\n  <rte><name>${gpxEsc(name||'AFLOAT route')}</name>\n${rows}\n  </rte>\n</gpx>\n`;
}
