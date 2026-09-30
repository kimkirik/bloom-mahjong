import {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2);const value=(flag)=>args[args.indexOf(flag)+1];
const id=args.includes('--database-id')?value('--database-id'):'';const name=args.includes('--name')?value('--name'):'bloom-mahjong';
if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[a-z][a-z0-9-]{1,62}$/.test(name))throw new Error('Use --database-id <D1 UUID> --name <worker-name>.');
const path='dist/server/wrangler.json';const config=JSON.parse(readFileSync(path,'utf8'));config.name=name;config.d1_databases=[{binding:'DB',database_name:'bloom-mahjong',database_id:id}];writeFileSync(path,JSON.stringify(config,null,2)+'\n');console.log('Cloudflare build configuration updated. No credentials written.');
