import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const archive=process.argv[2];
assert.ok(archive,'Pass the Sites deployment .tar.gz archive path.');
const entries=new Set(execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n').map(p=>p.replace(/^\.\//,'')));
for(const file of ['dist/server/index.js','dist/.openai/hosting.json','dist/.openai/drizzle/meta/_journal.json',...readdirSync('drizzle').filter(p=>p.endsWith('.sql')).map(p=>'dist/.openai/drizzle/'+p)]){
 assert.ok(entries.has(file),`Missing required deployment file: ${file}. An archive can deploy successfully but fail to create the database tables if migrations are outside dist/.openai/drizzle/.`);
}
console.log('Deployment archive contains the Worker, manifest, and all D1 migrations at the required paths.');
