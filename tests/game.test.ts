import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,makeBoard,findPath,findPair,applyEvent,replay,STAGE_SECONDS,STAGE_TYPES,STAGE_COUNT,LEGACY_STAGE_COUNT,COLS,ROWS} from '../lib/game.ts';
function oracle(board:number[],a:number,b:number){if(a===b||board[a]<0||board[a]!==board[b])return false;const q:[[number,number,number,number]]=[[a%15,Math.floor(a/15),-1,0]];const seen=new Map<string,number>();while(q.length){const [x,y,d,n]=q.shift()!;for(let nd=0;nd<4;nd++){const nx=x+[1,-1,0,0][nd],ny=y+[0,0,1,-1][nd],turns=n+(d!==-1&&d!==nd?1:0);if(turns>2||nx< -1||nx>15||ny< -1||ny>8)continue;if(nx===b%15&&ny===Math.floor(b/15))return true;if(nx>=0&&nx<15&&ny>=0&&ny<8&&board[ny*15+nx]>=0)continue;const k=[nx,ny,nd].join(',');if((seen.get(k)??99)<=turns)continue;seen.set(k,turns);q.push([nx,ny,nd,turns]);}}return false;}
test('original dimensions, level durations, type counts and paired distributions',()=>{assert.equal(COLS,15);assert.equal(ROWS,8);assert.equal(STAGE_COUNT,20);assert.deepEqual(STAGE_SECONDS.slice(0,6),[240,180,240,180,240,180]);assert.deepEqual(STAGE_TYPES.slice(0,6),[20,20,25,25,30,30]);assert.equal(STAGE_SECONDS.length,20);assert.equal(STAGE_TYPES.length,20);for(let stage=1;stage<=20;stage++){const b=makeBoard(743,stage);assert.equal(b.length,120);assert.equal(new Set(b).size,STAGE_TYPES[stage-1]);for(const t of new Set(b))assert.equal(b.filter(v=>v===t).length%2,0);assert.ok(findPair(b));assert.deepEqual(b,makeBoard(743,stage));}});
test('straight, one turn, two turns, outer rim and blocked matches',()=>{const b=Array(120).fill(-1);b[0]=b[4]=1;assert.equal(findPath(b,0,4)?.length,2);b[1]=2;assert.equal(findPath(b,0,4)?.length,4);assert.ok(findPath(b,0,4)?.some(p=>p.y<0));const full=Array(120).fill(2);full[32]=full[64]=1;assert.equal(findPath(full,32,64),null);assert.equal(findPath(b,0,0),null);assert.equal(findPath(b,0,1),null);assert.equal(findPath(b,-1,4),null);});
test('connection rules agree with independent directional BFS across 1,800 cases',()=>{let n=723;const rng=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/2**32;};for(let i=0;i<1800;i++){const b:number[]=Array.from({length:120},()=>rng()<.48?-1:2);const a=Math.floor(rng()*120),c=Math.floor(rng()*120);b[a]=b[c]=1;assert.equal(!!findPath(b,a,c),oracle(b,a,c),`case ${i}, ${a}, ${c}`);}});
test('match adds 200 and 2 seconds, mismatch subtracts 10 seconds, hints auto-remove globally',()=>{let s=newGame(11);const [a,b]=findPair(s.board)!;s=applyEvent(s,{kind:'pair',a,b,elapsed:1000});assert.equal(s.score,200);assert.equal(s.remainingMs,241000);assert.equal(s.board[a],-1);const next=findPair(s.board)!;s=applyEvent(s,{kind:'pair',a:next[0],b:next[0],elapsed:1000});assert.equal(s.remainingMs,231000);assert.equal(s.score,200);s=applyEvent(s,{kind:'hint',elapsed:1000});assert.equal(s.hints,2);assert.equal(s.score,400);assert.equal(s.remainingMs,233000);});
test('clear bonus, twenty-stage completion and carry-over hint count',()=>{let s=newGame(9);s.hints=1;for(let stage=1;stage<=20;stage++){s.board=Array(120).fill(-1);s.board[0]=s.board[1]=0;s.remainingMs=20000;const previous=s.score;s=applyEvent(s,{kind:'pair',a:0,b:1,elapsed:s.elapsed});assert.equal(s.bonus,stage*100+220);assert.equal(s.score,previous+200+stage*100+220);assert.equal(s.status,stage===20?'won':'stageclear');if(stage<20){s=applyEvent(s,{kind:'next',elapsed:s.elapsed});assert.equal(s.remainingMs,STAGE_SECONDS[stage]*1000);assert.equal(s.hints,1);}}assert.throws(()=>applyEvent(s,{kind:'hint',elapsed:0}));});
test('timeout, stuck and invalid event transitions',()=>{let s=newGame(2);assert.equal(applyEvent(s,{kind:'timeout',elapsed:240000}).status,'timeout');assert.throws(()=>applyEvent(s,{kind:'timeout',elapsed:0}));assert.throws(()=>applyEvent(s,{kind:'next',elapsed:0}));assert.throws(()=>applyEvent(s,{kind:'pair',a:-1,b:9,elapsed:0}));assert.throws(()=>applyEvent(s,{kind:'quit',elapsed:-1}));s.board=Array(120).fill(3);s.board[0]=s.board[1]=1;s.board[17]=2;s.board[102]=2;const next=applyEvent(s,{kind:'pair',a:0,b:1,elapsed:0});assert.equal(next.score,200);const stuck=Array(120).fill(-1);[0,1,15,16].forEach((p,i)=>stuck[p]=[1,2,2,1][i]);assert.equal(findPair(stuck),null);stuck[90]=stuck[91]=3;s.board=stuck;assert.equal(applyEvent(s,{kind:'pair',a:90,b:91,elapsed:0}).status,'stuck');});
test('replay reproduces an entire played game and rejects non-monotonic time',()=>{let s=newGame(982),events=[];for(let step=0;step<400;step++){if(s.status==='stageclear'){const e={kind:'next' as const,elapsed:s.elapsed};events.push(e);s=applyEvent(s,e);continue;}if(s.status!=='playing')break;const pair=findPair(s.board)!;const e={kind:'pair' as const,a:pair[0],b:pair[1],elapsed:s.elapsed+500};events.push(e);s=applyEvent(s,e);}if(s.status==='playing'){const e={kind:'quit' as const,elapsed:s.elapsed};events.push(e);s=applyEvent(s,e);}assert.deepEqual(replay(982,events),s);assert.ok(s.score>0);assert.throws(()=>replay(982,[{kind:'pair',a:0,b:1,elapsed:100},{kind:'quit',elapsed:0}]));});
test('twenty-stage boundaries and legacy sessions keep their own final stage',()=>{
 for(const total of [LEGACY_STAGE_COUNT,STAGE_COUNT]){
  let state=newGame(17,total);
  state={...state,stage:total,board:Array(120).fill(-1)};
  state.board[0]=state.board[1]=0;
  const done=applyEvent(state,{kind:'pair',a:0,b:1,elapsed:0});
  assert.equal(done.status,'won');assert.equal(done.stage,total);
  assert.throws(()=>applyEvent(done,{kind:'next',elapsed:0}));
 }
 assert.throws(()=>makeBoard(1,0));assert.throws(()=>makeBoard(1,21));assert.throws(()=>newGame(1,21));
 let sixth={...newGame(1),stage:6,board:Array(120).fill(-1)};sixth.board[0]=sixth.board[1]=0;
 const clear=applyEvent(sixth,{kind:'pair',a:0,b:1,elapsed:0});assert.equal(clear.status,'stageclear');
 const seventh=applyEvent(clear,{kind:'next',elapsed:0});assert.equal(seventh.stage,7);assert.equal(seventh.remainingMs,240000);assert.equal(new Set(seventh.board).size,30);
});

test('a complete legal 1,200-pair campaign replays through stage 20 and preserves six-stage saves',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./campaign-fixture.json',import.meta.url),'utf8')) as {seed:number;stages:[number,number][][]};
 for(const count of [LEGACY_STAGE_COUNT,STAGE_COUNT]){
  const events:Parameters<typeof replay>[1]=[];let elapsed=0;
  for(let stage=1;stage<=count;stage++){
   if(stage>1)events.push({kind:'next',elapsed});
   for(const [a,b]of fixture.stages[stage-1])events.push({kind:'pair',a,b,elapsed:elapsed+=500});
  }
  const result=replay(fixture.seed,events,count);
  const bonuses=STAGE_SECONDS.slice(0,count).reduce((sum,seconds,i)=>sum+(i+1)*100+(seconds+120-30)*10,0);
  assert.equal(result.status,'won');assert.equal(result.stage,count);assert.equal(result.matched,count*60);
  assert.equal(result.score,count*12000+bonuses);assert.equal(result.board.filter(v=>v>=0).length,0);
  if(count===20)assert.throws(()=>replay(fixture.seed,events,LEGACY_STAGE_COUNT));
 }
});
