export const COLS = 15, ROWS = 8, TILE_COUNT = 120;
export const STAGE_SECONDS = [240, 180, 240, 180, 240, 180];
export const STAGE_TYPES = [20, 20, 25, 25, 30, 30];
export const MOTIFS = ['딸기','오렌지','레몬','라임','포도','복숭아','체리','수박','배','사과','블루베리','파인애플','연꽃','데이지','장미','바이올렛','키위','바나나','망고','용과','코코넛','아보카도','라즈베리','자두','해바라기','튤립','수국','난초','백합','히비스커스'];
export type Point = {x:number;y:number};
export type Status = 'playing'|'stageclear'|'won'|'timeout'|'stuck'|'quit';
export type GameState = {seed:number;board:number[];stage:number;score:number;hints:number;remainingMs:number;elapsed:number;status:Status;matched:number;bonus:number};
export type GameEvent = {kind:'pair'|'hint'|'next'|'timeout'|'quit';elapsed:number;a?:number;b?:number};
export function random(seed:number){let n=seed>>>0;return ()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffled<T>(items:T[],rng:()=>number){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const point=(i:number):Point=>({x:i%COLS,y:Math.floor(i/COLS)});
export function findPath(board:number[],a:number,b:number):Point[]|null {
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=120||b>=120||a===b||board[a]<0||board[a]!==board[b])return null;
 const s=point(a),t=point(b);
 const free=(p:Point)=>p.x<0||p.y<0||p.x>=COLS||p.y>=ROWS||board[p.y*COLS+p.x]<0||(p.x===s.x&&p.y===s.y)||(p.x===t.x&&p.y===t.y);
 const clear=(p:Point,q:Point)=>{if(p.x!==q.x&&p.y!==q.y)return false;let x=p.x,y=p.y;const dx=Math.sign(q.x-x),dy=Math.sign(q.y-y);if(!free(p))return false;while(x!==q.x||y!==q.y){x+=dx;y+=dy;if(!free({x,y}))return false;}return true;};
 const simplify=(p:Point[])=>p.filter((v,i)=>i===0||v.x!==p[i-1].x||v.y!==p[i-1].y).filter((v,i,ar)=>i===0||i===ar.length-1||!((ar[i-1].x===v.x&&ar[i+1].x===v.x)||(ar[i-1].y===v.y&&ar[i+1].y===v.y)));
 if(clear(s,t))return [s,t];
 for(const c of [{x:s.x,y:t.y},{x:t.x,y:s.y}])if(clear(s,c)&&clear(c,t))return simplify([s,c,t]);
 for(let x=-1;x<=COLS;x++){const p={x,y:s.y},q={x,y:t.y};if(clear(s,p)&&clear(p,q)&&clear(q,t))return simplify([s,p,q,t]);}
 for(let y=-1;y<=ROWS;y++){const p={x:s.x,y},q={x:t.x,y};if(clear(s,p)&&clear(p,q)&&clear(q,t))return simplify([s,p,q,t]);}
 return null;
}
export function findPair(board:number[]):[number,number]|null {for(let a=0;a<board.length;a++)if(board[a]>=0)for(let b=a+1;b<board.length;b++)if(board[a]===board[b]&&findPath(board,a,b))return [a,b];return null;}
export function makeBoard(seed:number,stage:number){const rng=random(seed+stage*7919);const types=shuffled(Array.from({length:30},(_,i)=>i),rng).slice(0,STAGE_TYPES[stage-1]);const half=Array.from({length:60},(_,i)=>types[i%types.length]);let board=shuffled([...half,...half],rng);while(!findPair(board))board=shuffled(board,rng);return board;}
export function newGame(seed:number):GameState{return {seed,board:makeBoard(seed,1),stage:1,score:0,hints:3,remainingMs:240000,elapsed:0,status:'playing',matched:0,bonus:0};}
export function applyEvent(state:GameState,event:GameEvent):GameState{
 if(!event||!['pair','hint','next','timeout','quit'].includes(event.kind))throw new Error('유효하지 않은 동작입니다.');
 if(!Number.isFinite(event.elapsed)||event.elapsed<state.elapsed||event.elapsed>86400000)throw new Error('유효하지 않은 플레이 시간입니다.');
 if(event.kind==='next'){if(state.status!=='stageclear')throw new Error('다음 단계로 이동할 수 없습니다.');return {...state,stage:state.stage+1,board:makeBoard(state.seed,state.stage+1),remainingMs:STAGE_SECONDS[state.stage]*1000,elapsed:event.elapsed,status:'playing',bonus:0};}
 if(state.status!=='playing')throw new Error('이미 종료된 게임입니다.');
 const s={...state,board:[...state.board],remainingMs:Math.max(0,state.remainingMs-(event.elapsed-state.elapsed)),elapsed:event.elapsed,bonus:0};
 if(s.remainingMs<=0){s.status='timeout';return s;}
 if(event.kind==='quit'){s.status='quit';return s;}
 if(event.kind==='timeout')throw new Error('아직 시간이 남아 있습니다.');
 let a=event.a,b=event.b;
 if(event.kind==='hint'){if(s.hints<=0)throw new Error('힌트를 모두 사용했습니다.');const pair=findPair(s.board);if(!pair){s.status='stuck';return s;}[a,b]=pair;s.hints--;}
 if(a===undefined||b===undefined||!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=120||b>=120||s.board[a]<0||s.board[b]<0)throw new Error('존재하지 않는 타일입니다.');
 if(!findPath(s.board,a,b)){s.remainingMs=Math.max(0,s.remainingMs-10000);if(s.remainingMs===0)s.status='timeout';return s;}
 s.board[a]=-1;s.board[b]=-1;s.score+=200;s.matched++;s.remainingMs+=2000;
 if(s.board.every(t=>t<0)){s.bonus=s.stage*100+Math.ceil(s.remainingMs/1000)*10;s.score+=s.bonus;s.status=s.stage===6?'won':'stageclear';}
 else if(!findPair(s.board))s.status='stuck';
 return s;
}
export function replay(seed:number,events:GameEvent[]){if(!Array.isArray(events)||events.length>10000)throw new Error('플레이 기록이 올바르지 않습니다.');return events.reduce(applyEvent,newGame(seed));}
export const ended=(s:Status)=>['won','timeout','stuck','quit'].includes(s);
