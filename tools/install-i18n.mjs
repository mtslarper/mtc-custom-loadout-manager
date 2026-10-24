// Patch display labels in the mirrored page, keeping all game/store values intact.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filename = path.join(root, 'public/_next/static/chunks/pages/index-211ecad247b1f53d.js');
let code = readFileSync(filename, 'utf8');
if (!code.includes('function __tr(')) {
  const edit = (from, to) => {
    if (code.split(from).length !== 2) throw new Error('Language patch anchor changed: ' + from.slice(0, 100));
    code = code.replace(from, () => to);
  };
  // English is the hydration snapshot. The stored preference applies after hydration.
  edit('function e2(e){', 'function __tr(key,values){return window.LoadoutI18n.t(key,values)}function e2(e){let __language=l.useSyncExternalStore(window.LoadoutI18n.subscribe,window.LoadoutI18n.getLanguage,()=>"en");l.useEffect(()=>{window.LoadoutI18n.restoreLanguage()},[]);l.useEffect(()=>{document.documentElement.lang=__language},[__language]);');
  const labels = ['Danger zone', 'Confirm reset', 'Nevermind', 'Reset loadout', 'Export', 'Export the current loadout. Save it to storage, download a JSON file, or share it via a link.', 'Download loadout JSON', 'Copy loadout JSON', 'Copy share link', 'Save as', 'Confirm deletion', 'Delete', 'Import', 'Import a loadout from storage.', 'No saves found', 'Import loadout', 'Import from file', 'No properties found'];
  for (const label of labels) code = code.replaceAll('children:' + JSON.stringify(label), 'children:__tr(' + JSON.stringify(label) + ')');
  for (const [prop, label] of [['placeholder', 'Loadout name'], ['placeholder', 'Search...'], ['placeholder', 'None'], ['title', 'A problem has occurred']]) code = code.replaceAll(prop + ':' + JSON.stringify(label), prop + ':__tr(' + JSON.stringify(label) + ')');
  edit('value:t,children:t},n)', 'value:t,children:__tr(t)},n)');
  edit('function v(){return(0,r.jsx)(o.A,{direction:"row",sx:{justifyContent:"space-between",alignItems:"center"},children:(0,r.jsx)(g,{})})}', 'function v(){let ready=l.useSyncExternalStore(()=>()=>{},()=>true,()=>false),locale=window.LoadoutI18n.getLanguage();return(0,r.jsxs)(o.A,{direction:"row",sx:ready?{justifyContent:"flex-start",alignItems:"center",gap:1,flexWrap:"wrap"}:{justifyContent:"space-between",alignItems:"center"},children:[(0,r.jsx)(g,{}),ready&&(0,r.jsxs)(W.A,{id:"loadout-language-toggle",size:"sm",variant:"plain",color:"neutral",type:"button","aria-label":__tr(locale==="en"?"Switch to Russian":"Switch to English"),title:__tr("Language"),onClick:()=>window.LoadoutI18n.setLanguage(locale==="en"?"ru":"en"),sx:{minHeight:32,fontSize:13,gap:.5},children:[(0,r.jsx)("span",{lang:"en",style:{fontWeight:locale==="en"?700:400,opacity:locale==="en"?1:.55},children:"EN"})," / ",(0,r.jsx)("span",{lang:"ru",style:{fontWeight:locale==="ru"?700:400,opacity:locale==="ru"?1:.55},children:"RU"})]})]})}');
  edit('children:n?"Deselect":"Select"', 'children:__tr(n?"Deselect":"Select")');
  edit('children:["Select a ","Vehicles"===t?"vehicle":"weapon"," to edit"]', 'children:[__tr("Vehicles"===t?"Select a vehicle to edit":"Select a weapon to edit")]');
  edit('children:c.name||c.team||"Team ".concat(a.columnIndex)', 'children:a.columnIndex===0&&c.name==="Shared"?__tr("Shared"):c.name||c.team||__tr("Team ").concat(a.columnIndex)');
  edit('children:s.name}),d]', 'children:__tr(s.name)}),d]');
  edit('value:e,children:e},e))', 'value:e,children:__tr(e)},e))');
  edit('!important")}}),children:t}', '!important")}}),children:__tr(t)}');
  edit('children:o.name}', 'children:t===0&&o.name==="Shared"?__tr("Shared"):o.name}');
  edit('children:["Tier ",a]', 'children:[__tr("Tier "),a]');
  edit('"Add team"]', '__tr("Add team")]');
  // Translate stored status strings at render time so an open message changes language too.
  for (const name of ['n', 'm', 'd', 'a', 's']) code = code.replaceAll('variant:"solid",children:' + name + '}', 'variant:"solid",children:window.LoadoutI18n.message(' + name + ')}');
  writeFileSync(filename, code);
}
const htmlPath = path.join(root, 'public/index.html');
let html = readFileSync(htmlPath, 'utf8');
if (!html.includes('src="/i18n.js"')) html = html.replace('<head>', '<head><script defer src="/i18n.js"></script>');
writeFileSync(htmlPath, html);
console.log('English/Russian language switch installed.');
