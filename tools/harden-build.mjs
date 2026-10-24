import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentSecurityPolicy } from '../server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'public/_next/static/chunks/pages/index-211ecad247b1f53d.js');
let code = readFileSync(file, 'utf8');
const from = 'let d=JSON.parse(await file.text()),fn=file.name.replace(/.editor.json$|.json$/i,"");';
const handlerStart = code.indexOf('onClick:()=>{i(""),c("");let f=document.createElement("input");');
if (!code.includes('window.LoadoutIO.readFile(file)')) {
  if (handlerStart < 0) throw new Error('File import handler not found');
  const handlerEnd = code.indexOf('};f.click()}', handlerStart);
  if (handlerEnd < 0) throw new Error('File import handler boundary not found');
  const handler = 'onClick:()=>{i(""),c("");let f=document.createElement("input");f.type="file";f.accept=".json,application/json";f.multiple=!0;f.onchange=async()=>{if(f.files.length>20)return i("Select at most 20 files");let ok=0,errs=[];for(let file of Array.from(f.files||[])){try{let result=await window.LoadoutIO.readFile(file),base=String(result.name).replace(/[^a-zA-Z0-9 _()+.-]/g,"").trim().slice(0,100)||"Imported",all=ee.getState().saves.map(x=>x.name),name=base,k=2;for(;all.includes(name);)name=base+" "+k++;ee.getState().addSave({id:crypto.randomUUID(),name,save:result.save});ok++}catch(e){errs.push(file.name+": "+e.message)}}errs.length&&i("Import failed - "+errs.join("; ")),ok&&c("Imported "+ok+" preset(s) from file")};f.click()}';
  code = code.slice(0, handlerStart) + handler + code.slice(handlerEnd + '};f.click()}'.length);
}
if (!code.includes('window.LoadoutIO.decodeShare(t')) {
  const start = code.indexOf('let e=function(e){try{var t;let n=function(e){let t=atob(');
  const end = code.indexOf(';e&&I.setState(e)', start);
  if (start < 0 || end < 0) throw new Error('Share decoder boundary not found');
  code = code.slice(0, start) + 'window.LoadoutIO.decodeShare(t,n=>(0,N.D)(n)).then(e=>I.setState(e)).catch(()=>console.error("Invalid share link"))' + code.slice(end + ';e&&I.setState(e)'.length);
}
// Export dictionaries must not interpret team names as inherited prototype properties.
code = code.replace('n={WeaponClasses:{},Vehicles:{GeneralLoadout:[],TeamSpecificLoadout:{}}}', 'n={WeaponClasses:Object.create(null),Vehicles:{GeneralLoadout:[],TeamSpecificLoadout:Object.create(null)}}');
// Multi-copy should only replace an existing item in the destination cell.
const unsafeCopy = '(same&&x.columnIndex===T.columnIndex&&x.className===T.className||same&&x.className===(S0.className||T.className)&&(0===T.columnIndex?0!==x.columnIndex:0===x.columnIndex))&&i(x.id)';
code = code.replace(unsafeCopy, '(same&&x.columnIndex===T.columnIndex&&x.className===T.className)&&i(x.id)');
writeFileSync(file, code);
const htmlFile = path.join(root, 'public/index.html');
let html = readFileSync(htmlFile, 'utf8');
const nextPattern = /(<script id="__NEXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/;
const match = html.match(nextPattern);
if (!match) throw new Error('Next page data missing');
const data = JSON.parse(match[2]);
data.props.pageProps.presets = data.props.pageProps.presets.filter(p => !p.id?.startsWith('custom-') && !/full fish/i.test(p.name));
html = html.replace(nextPattern, () => match[1] + JSON.stringify(data).replaceAll('<', '\\u003c') + match[3]);
if (!html.includes('src="/loadout-io.js"')) html = html.replace('<head>', '<head><script defer src="/loadout-io.js"></script>');
if (!html.includes('http-equiv="Content-Security-Policy"')) html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy.replace("; frame-ancestors 'none'", '')}">`);
writeFileSync(htmlFile, html);
console.log('Import/share validation, public presets and CSP hardened.');
