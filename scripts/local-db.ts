import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
const pg=new EmbeddedPostgres({databaseDir:'.local-db',user:'digitallab',password:'local-development-only',port:54329,persistent:true,onLog:()=>{},onError:message=>console.error(String(message))});
if(!existsSync('.local-db/PG_VERSION'))await pg.initialise();
await pg.start();
try{await pg.createDatabase('digitallab');}catch(e){if(!(e as Error).message.includes('already exists'))throw e;}
console.log('Local PostgreSQL ready on 127.0.0.1:54329 (development only).');
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await pg.stop();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
await new Promise(()=>{});
