/** Verify native Markdown editing and article/issue rendering against a running Nua preview. Restores its fixture. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createCmsCore,createNodeFs} from '@nuasite/cms-core';
const root=process.cwd();
const core=createCmsCore(createNodeFs(root));
const def=(await core.scanCollections())['zpravodaj-articles'];
assert(!def.fragment); assert.deepEqual(def.pathname,[{literal:'zpravodaj'},{literal:'clanky'},{field:'slug'}]);
const slug='zpravodaj_ombudsmana_a_detskeho_ombudsmana_za_brezen_a_duben_2026--0001';
const filePath=`src/content/zpravodaj-articles/${slug}.md`;
const original=readFileSync(`${root}/${filePath}`,'utf8');
const base=process.env.CMS_VERIFY_URL ?? 'http://127.0.0.1:4335';
async function get(path:string, payload?:unknown){const r=await fetch(`${base}${path}`,payload?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{});assert(r.ok,`${path} ${r.status}`);return r.json();}
try {
const entry=await get(`/_nua/cms/markdown/content?filePath=${encodeURIComponent(filePath)}`);
assert(entry.content.includes('každodenní'));
const content=entry.content+'\n\nOvěření ukládání článku Zpravodaje.\n';
const saved=await get('/_nua/cms/markdown/update',{filePath,frontmatter:entry.frontmatter,content});assert(saved.success,JSON.stringify(saved));
assert(readFileSync(`${root}/${filePath}`,'utf8').includes('Ověření ukládání'));
for(const path of [`/zpravodaj/clanky/${slug}/`,`/zpravodaj/${entry.frontmatter.parent}/`]) {
let html=''; for(let i=0;i<30;i++){html=await fetch(base+path).then(r=>r.text());if(html.includes('Ověření ukládání'))break;await Bun.sleep(200);}
assert(html.includes('Ověření ukládání'),`${path}: saved body absent`); assert(!html.includes('TypeError:'));
}
console.log('PASS: standard article preview pathname, native Markdown read/write and changed body in article + parent issue under Pletivo.');
}finally{writeFileSync(`${root}/${filePath}`,original);}
