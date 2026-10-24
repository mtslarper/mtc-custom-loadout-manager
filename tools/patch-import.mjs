// Adds "Import from file" to the Manage tab of the mirrored build.
// Accepts editor presets (*.editor.json) and game exports (WeaponClasses + Vehicles).
// Usage: node tools/patch-import.mjs   (idempotent; restores the original chunk first)
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const f = path.join(root, 'public/_next/static/chunks/pages/index-211ecad247b1f53d.js');
const original = path.join(root, 'tools/upstream/index.js');
if (!existsSync(original)) {
  mkdirSync(path.dirname(original), { recursive: true });
  copyFileSync(existsSync(f + '.orig') ? f + '.orig' : f, original);
}
let s = readFileSync(original, 'utf8');
const anchor = 'children:"Import loadout"}),a&&';
if (s.split(anchor).length !== 2) throw new Error('anchor not unique');

const convert = `(g=>{let cls=["Infantry","Crewman","Engineer"],cats=["Primary","Secondary","Tertiary","PassiveTools"],id=()=>crypto.randomUUID(),items={},teams=[],cols=[{name:"Shared",undeletable:!0,unconfigurable:!0}],vk={LimitPerTeam:["teamLimit","Team Limit"],LimitPerMatch:["matchLimit","Match Limit"],LimitPerMatchTeam:["teamMatchLimit","Team Match Limit"]},col=t=>{let k=teams.indexOf(t);if(k<0){teams.push(t);cols.push({team:t});k=teams.length-1}return k+1},extra=(e,p,skip)=>{for(let[k,v]of Object.entries(e))if(!skip.includes(k)&&"number"==typeof v)p[k]={name:k,exportKey:k,type:"number",value:v}},addV=(e,c)=>{let p={};for(let[k,[n,l]]of Object.entries(vk)){p[n]={name:l,exportKey:k,type:"number"};void 0!==e[k]&&(p[n].value=e[k])}extra(e,p,["NameID","Tier",...Object.keys(vk)]);let i=id();items[i]={id:i,name:e.NameID,type:"vehicle",properties:p,columnIndex:c,...void 0!==e.Tier?{tier:e.Tier}:{}}},addW=(e,c,cn,cat)=>{let p={category:{name:"Category",type:"select",options:cats,value:cat}};extra(e,p,["NameID","Tier"]);let i=id();items[i]={id:i,name:e.NameID,type:"weapon",properties:p,columnIndex:c,className:cn,...void 0!==e.Tier?{tier:e.Tier}:{}}},weapons=(o,c)=>{for(let cn of cls)for(let cat of cats)for(let e of(o&&o[cn]&&o[cn][cat])||[])addW(e,c,cn,cat)};for(let[k,v]of Object.entries(g.WeaponClasses||{}))cls.includes(k)?0:col(k);for(let k of Object.keys((g.Vehicles||{}).TeamSpecificLoadout||{}))col(k);weapons(g.WeaponClasses,0);for(let t of teams)weapons(g.WeaponClasses[t],col(t));for(let e of(g.Vehicles||{}).GeneralLoadout||[])addV(e,0);for(let t of teams)for(let e of g.Vehicles.TeamSpecificLoadout?.[t]||[])addV(e,col(t));return{columns:cols,items:items}})`;

const handler = `()=>{i(""),c("");let f=document.createElement("input");f.type="file";f.accept=".json,application/json";f.multiple=!0;f.onchange=async()=>{let ok=0,errs=[];for(let file of Array.from(f.files||[])){try{let d=JSON.parse(await file.text()),fn=file.name.replace(/\.editor\.json$|\.json$/i,"");if(d&&d.save&&!d.columns)d=d.save;if(d&&d.WeaponClasses&&d.Vehicles)d=${convert}(d);if(!d||!Array.isArray(d.columns)||!d.items||"object"!=typeof d.items)throw Error("not an editor preset or game export");let base=String(d.name||fn).replace(/[^a-zA-Z0-9 _()+.-]/g,"").trim()||"Imported",all=ee.getState().saves.map(x=>x.name),name=base,k=2;for(;all.includes(name);)name=base+" "+k++;ee.getState().addSave({id:crypto.randomUUID(),name:name,save:{columns:d.columns,items:d.items,selected:null}});ok++}catch(e){errs.push(file.name+": "+e.message)}}errs.length&&i("Import failed - "+errs.join("; ")),ok&&c("Imported "+ok+" preset(s) from file")};f.click()}`;
const btn = `(0,r.jsx)(W.A,{color:"neutral",variant:"outlined",startDecorator:(0,r.jsx)(es.A,{}),sx:{width:"max-content"},onClick:${handler},children:"Import from file"}),`;
s = s.replace(anchor, () => 'children:"Import loadout"}),' + btn + 'a&&');

// Multi-select copy: Shift+click items to select several, then drag one of them to copy all to another cell.
function edit(from, to) {
  if (s.split(from).length !== 2) throw new Error('anchor not unique: ' + from.slice(0, 60));
  s = s.replace(from, () => to);
}
edit('function ev(e){let{item:t,sx:n,children:s,...o}=e,',
  'var __ms=new Set(),__msl=new Set();function __msset(f){f(__ms);__msl.forEach(x=>x())}function __msuse(id){return l.useSyncExternalStore(cb=>(__msl.add(cb),()=>__msl.delete(cb)),()=>__ms.has(id),()=>!1)}"undefined"!=typeof document&&document.addEventListener("keydown",e=>{"Escape"===e.key&&__ms.size&&__msset(q=>q.clear())});' +
  'function ev(e){let{item:t,sx:n,children:s,badge:bd,...o}=e,ms=__msuse(t.id),');
edit('onClick:()=>{-1!==t.columnIndex&&(u?d(null):d({item:t}))}',
  'onClick:ev2=>{if(-1===t.columnIndex)return;if(ev2.shiftKey){__msset(q=>{q.has(t.id)?q.delete(t.id):q.add(t.id)});return}__msset(q=>{q.clear()});u?d(null):d({item:t})}');
edit('outlineWidth:2}}),n)',
  'outlineWidth:2},...ms&&-1!==t.columnIndex&&{outlineColor:"#f59e0b",outlineStyle:"solid",outlineWidth:2},userSelect:"none"}),n)');
edit('backgroundColor:g}}),s||v]})}',
  'backgroundColor:g}}),s||v,bd?(0,r.jsx)("span",{style:{position:"absolute",right:6,top:2,fontSize:11,padding:"0 5px",borderRadius:8,background:"#f59e0b",color:"#000"},children:"+"+bd}):null]})}');
edit('children:o&&(0,r.jsx)(ev,{item:o.item,sx:',
  'children:o&&(0,r.jsx)(ev,{item:o.item,badge:__ms.has(o.item.id)&&__ms.size>1?__ms.size-1:0,sx:');
edit('if(c(null),s(null),!t)return;let l={...t.data.current.item};',
  'if(c(null),s(null),!t)return;' +
  'if(__ms.has(t.id)){if(!r)return;let T=r.data.current,ids=[...__ms],sel=new Set(ids),mk={};__msset(q=>q.clear());for(let id of ids){let S0=n[id];if(!S0)continue;if(S0.columnIndex===T.columnIndex&&S0.className===T.className){S0.tier!==T.tier&&a(id,{...S0,tier:T.tier});continue}let cp={...S0,id:(0,el.A)(),properties:structuredClone(S0.properties),columnIndex:T.columnIndex,className:T.className,tier:T.tier};for(let x of Object.values(n)){if(sel.has(x.id))continue;let same=x.name===cp.name&&x.type===cp.type;(same&&x.columnIndex===T.columnIndex&&x.className===T.className||same&&x.className===(S0.className||T.className)&&(0===T.columnIndex?0!==x.columnIndex:0===x.columnIndex))&&i(x.id)}let k=cp.type+"|"+cp.name;mk[k]&&i(mk[k]);mk[k]=cp.id;a(cp.id,cp)}return}' +
  'let l={...t.data.current.item};');

writeFileSync(f, s);
console.log('patched');
// Reapplying import/multi-select patches must preserve vehicle cards as well.
await import('./install-vehicle-hover.mjs');
await import('./harden-build.mjs');
