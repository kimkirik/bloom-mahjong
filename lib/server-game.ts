import {STAGE_COUNT,LEGACY_STAGE_COUNT} from './game';
export const CAMPAIGN_TOKEN_PREFIX='bloom20.';
// Read only after verifying the hash of the entire token. The prefix is bound
// to the saved hash, so changing it cannot convert a six-stage session to 20.
export function authenticatedStageCount(token:string){return token.startsWith(CAMPAIGN_TOKEN_PREFIX)?STAGE_COUNT:LEGACY_STAGE_COUNT;}
export async function hashToken(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),n=>n.toString(16).padStart(2,'0')).join('');}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
export function jsonError(message:string,status=400){return Response.json({error:message},{status});}
