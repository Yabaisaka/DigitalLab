import {cpSync,existsSync,mkdirSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
// Only pure JavaScript dependencies can be transferred into the Linux cached build.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=join(root,'.deploy-deps','packages');
rmSync(destination,{recursive:true,force:true});mkdirSync(destination,{recursive:true});
const seen=new Set();
function locate(name,parent){let folder=parent;while(folder.startsWith(root)){const candidate=join(folder,'node_modules',name);if(existsSync(join(candidate,'package.json')))return candidate;if(folder===root)break;folder=dirname(folder);}throw new Error(`Missing installed dependency: ${name}`);}
function checkPureJs(folder){for(const e of readdirSync(folder,{withFileTypes:true})){const path=join(folder,e.name);if(e.isDirectory())checkPureJs(path);else if(e.name.endsWith('.node'))throw new Error('Native dependency requires an architecture-specific build');}}
function bundle(name,parent){const folder=locate(name,parent);if(seen.has(folder))return;seen.add(folder);checkPureJs(folder);cpSync(folder,join(destination,relative(join(root,'node_modules'),folder)),{recursive:true});const pkg=JSON.parse(readFileSync(join(folder,'package.json'),'utf8'));for(const dep of Object.keys(pkg.dependencies||{}))bundle(dep,folder);}
for(const name of ['react-markdown','remark-gfm'])bundle(name,root);
console.log(`Bundled ${seen.size} pure JavaScript packages for the offline update.`);
