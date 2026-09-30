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
type SoundKind='select'|'match'|'error'|'win'|'start'|'urgent'|'tick';
export function sound(kind:SoundKind,volume:number,streak=1){
 if(!context||volume<=0)return;
 const c=context,now=c.currentTime,master=c.createGain(),limiter=c.createDynamicsCompressor();
 master.gain.value=Math.min(1,volume)*.52;
 limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.15;
 master.connect(limiter);limiter.connect(c.destination);
 // A soft music dip leaves room for the chimes, then restores the chosen volume.
 if(musicBus&&kind!=='select'&&kind!=='tick'){
  const gain=musicBus.gain;gain.cancelScheduledValues(now);gain.setTargetAtTime(musicVolume*.57,now,.035);gain.setTargetAtTime(musicVolume,now+.38,.18);
 }
 const tone=(frequency:number,delay:number,duration:number,type:OscillatorType='sine',level=.3,end=frequency,pan=0)=>{
  const osc=c.createOscillator(),gain=c.createGain(),stereo=c.createStereoPanner();
  const at=now+delay;osc.type=type;osc.frequency.setValueAtTime(frequency,at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  stereo.pan.value=pan;osc.connect(gain);gain.connect(stereo);stereo.connect(master);osc.start(at);osc.stop(at+duration+.02);
  osc.onended=()=>{osc.disconnect();gain.disconnect();stereo.disconnect();};
 };
 const shimmer=(delay:number,duration:number,level:number)=>{
  const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type='highpass';filter.frequency.value=4200;gain.gain.value=level;
  source.connect(filter);filter.connect(gain);gain.connect(master);source.start(now+delay);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 };
 const bell=(f:number,at:number,strength:number,pan:number)=>{tone(f,at,.47,'sine',strength,f,pan);tone(f*2.76,at,.16,'sine',strength*.18,f*2.76,-pan);};
 if(kind==='select'){tone(920,0,.095,'sine',.32,480);tone(1550,.014,.07,'sine',.09);}
 if(kind==='match'){
  const lift=2**(Math.min(9,Math.max(0,streak-1))/24);
  tone(170,0,.15,'sine',.65,55);shimmer(.015,.2,.28);
  [784,988,1175,1568].forEach((f,i)=>bell(f*lift,i*.047,.36-i*.04,(i-1.5)*.25));
  if(streak>=3){[523,659,784].forEach((f,i)=>tone(f*lift,.08,.32,'triangle',.12,f*lift,(i-1)*.4));bell(2093*lift,.25,.17,.45);}
  if(streak>=6){[1319,1568,2093,2637].forEach((f,i)=>bell(f,.28+i*.055,.14,(i%2?1:-1)*.55));shimmer(.25,.35,.13);}
 }
 if(kind==='error'){[330,277,196].forEach((f,i)=>{tone(f,i*.075,.23,'triangle',.4,f*.65);tone(f*2,i*.075,.14,'sine',.11,f*1.4);});tone(85,.08,.16,'sine',.25,48);}
 if(kind==='urgent'){[659,880,659].forEach((f,i)=>bell(f,i*.14,.27,0));}
 if(kind==='tick'){tone(900+streak*35,0,.085,'sine',.28,700);tone(140,0,.06,'triangle',.14);}
 if(kind==='win'||kind==='start'){
  [523,659,784,1047,1319,1568].forEach((f,i)=>{bell(f,i*.075,.3,(i-2.5)*.15);tone(f/2,i*.075,.42,'triangle',.12);});
  [523,659,784].forEach(f=>tone(f,.5,.8,'triangle',.15));shimmer(.48,.6,.2);
 }
 setTimeout(()=>{master.disconnect();limiter.disconnect();},2000);
}
