let context:AudioContext|null=null;
let musicBus:GainNode|null=null,musicSource:AudioBufferSourceNode|null=null,musicBuffer:AudioBuffer|null=null;
let musicLoading:Promise<AudioBuffer>|null=null;
let musicWanted=false,musicVolume=.52,musicOffset=0,musicStartedAt=0;
let musicError=false;
function loadMusic(){
 if(musicBuffer)return Promise.resolve(musicBuffer);
 if(!context)return Promise.reject(new Error('Audio is locked'));
 const c=context;
 musicLoading??=fetch('/audio/run-amok.mp3').then(r=>{if(!r.ok)throw new Error('Music unavailable');return r.arrayBuffer();}).then(data=>c.decodeAudioData(data)).then(buffer=>{musicBuffer=buffer;musicError=false;return buffer;}).catch(error=>{musicLoading=null;musicError=true;throw error;});
 return musicLoading;
}
function beginMusic(){
 if(!context||context.state!=='running'||!musicWanted||musicSource||!musicBuffer)return;
 const c=context,bus=c.createGain(),source=c.createBufferSource();
 source.buffer=musicBuffer;source.loop=true;source.connect(bus);bus.connect(c.destination);
 bus.gain.setValueAtTime(0,c.currentTime);bus.gain.linearRampToValueAtTime(musicVolume,c.currentTime+.5);
 musicStartedAt=c.currentTime;source.start(0,musicOffset%musicBuffer.duration);musicBus=bus;musicSource=source;
 source.onended=()=>{source.disconnect();bus.disconnect();};
}
export function setBackgroundMusic(enabled:boolean,volume=.52){
 musicWanted=enabled;musicVolume=Math.max(0,Math.min(1,volume));
 if(!enabled){stopBackgroundMusic();return;}
 if(musicBus&&context){musicBus.gain.setTargetAtTime(musicVolume,context.currentTime,.15);return;}
 void loadMusic().then(beginMusic).catch(()=>{});
}
export function stopBackgroundMusic(){
 musicWanted=false;
 const source=musicSource,bus=musicBus;musicSource=null;musicBus=null;
 if(source&&bus&&context&&musicBuffer){musicOffset=(musicOffset+context.currentTime-musicStartedAt)%musicBuffer.duration;bus.gain.cancelScheduledValues(context.currentTime);bus.gain.setTargetAtTime(0,context.currentTime,.06);source.stop(context.currentTime+.2);}
}
export function audioStatus(){return {context:context?.state??'locked',musicPlaying:!!musicSource,musicReady:!!musicBuffer,musicError,track:'Run Amok — Kevin MacLeod'};}
export async function unlockAudio(){try{context??=new AudioContext();if(context.state==='suspended')await context.resume();void loadMusic().catch(()=>{});}catch{}}
export function sound(kind:'select'|'match'|'error'|'win'|'start'|'urgent'|'tick',volume:number,streak=1){if(!context||volume<=0)return;const c=context;const base=c.currentTime;const master=c.createGain();master.gain.value=volume*.32;master.connect(c.destination);
const tone=(f:number,delay:number,duration:number,type:OscillatorType='sine',gain=.5)=>{const osc=c.createOscillator(),g=c.createGain();osc.type=type;osc.frequency.setValueAtTime(f*(kind==='match'?1+Math.min(6,Math.max(0,streak-1))*.035:1),base+delay);g.gain.setValueAtTime(0,base+delay);g.gain.linearRampToValueAtTime(gain,base+delay+.008);g.gain.exponentialRampToValueAtTime(.001,base+delay+duration);osc.connect(g);g.connect(master);osc.start(base+delay);osc.stop(base+delay+duration+.03);};
if(kind==='urgent'){tone(440,0,.3,'sine',.3);tone(587,.2,.4,'sine',.28);}
if(kind==='tick')tone(520+streak*32,0,.11,'sine',.17);
if(kind==='select')tone(740,0,.1,'sine',.3);
if(kind==='error'){tone(170,0,.14,'triangle');tone(120,.08,.2,'triangle');}
if(kind==='match'){[784,1175,1568,2093].forEach((f,i)=>tone(f,i*.034,.34,'sine',.65-i*.09));tone(110,0,.15,'triangle',.7);const length=c.sampleRate*.18,buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3);const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();src.buffer=buffer;filter.type='highpass';filter.frequency.value=3500;g.gain.value=.25;src.connect(filter);filter.connect(g);g.connect(master);src.start(base);}
if(kind==='win'||kind==='start')[523,659,784,1047,1319].forEach((f,i)=>tone(f,i*.095,.6,'triangle',.35));setTimeout(()=>master.disconnect(),1800);}
