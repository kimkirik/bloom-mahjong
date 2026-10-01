import { getDb } from '../../../db';
import { STAGE_COUNT,LEGACY_STAGE_COUNT } from '../../../lib/game';
import { CAMPAIGN_TOKEN_PREFIX,hashToken,jsonError,sameOrigin } from '../../../lib/server-game';
export async function POST(request:Request){
 if(!sameOrigin(request))return jsonError('허용되지 않은 요청입니다.',403);
 try{
  const raw=await request.text();
  if(raw.length>1000)return jsonError('요청이 너무 큽니다.',413);
  // Already-open older clients send no body and retain their six-stage rules.
  let stageCount=LEGACY_STAGE_COUNT;
  if(raw.trim()){
   let input;try{input=JSON.parse(raw);}catch{return jsonError('잘못된 요청입니다.');}
   if(!input||typeof input!=='object'||Array.isArray(input))return jsonError('잘못된 요청입니다.');
   if(input.stageCount!==undefined){
    if(input.stageCount!==STAGE_COUNT&&input.stageCount!==LEGACY_STAGE_COUNT)return jsonError('지원하지 않는 게임 구성입니다.');
    stageCount=input.stageCount;
   }
  }
  const id=crypto.randomUUID(),token=(stageCount===STAGE_COUNT?CAMPAIGN_TOKEN_PREFIX:'')+crypto.randomUUID()+crypto.randomUUID(),seed=crypto.getRandomValues(new Uint32Array(1))[0],createdAt=Date.now();
  await getDb().prepare('INSERT INTO sessions (id,token_hash,seed,created_at) VALUES (?,?,?,?)').bind(id,await hashToken(token),seed,createdAt).run();
  return Response.json({id,token,seed,stageCount},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Session creation failed',error);return jsonError('게임을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.',503);}
}
