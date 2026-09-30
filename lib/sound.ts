let context:AudioContext|null=null;
let musicBus:GainNode|null=null;
let musicTimer:ReturnType<typeof setInterval>|null=null;
let musicBeat=0,nextBeat=0;
const beatSeconds=60/58;
const chords=[[48,55,59,62],[45,52,55,59],[41,48,52,57],[43,50,55,57]];
const melody=[72,null,76,null,74,null,71,null,69,null,72,null,71,null,67,null,69,null,72,null,76,null,72,null,74,null,71,null,69,null,67,null];

export function setBackgroundMusic(enabled:boolean,volume=.24){
 if(!enabled||!context){stopBackgroundMusic();return;}
 const c=context;
 if(musicBus){musicBus.gain.setTargetAtTime(volume*.22,c.currentTime,.4);return;}
 musicBus=c.createGain();musicBus.gain.setValueAtTime(0,c.currentTime);musicBus.gain.linearRampToValueAtTime(volume*.22,c.currentTime+1.5);musicBus.connect(c.destination);
 const bus=musicBus;nextBeat=c.currentTime+.12;
 const note=(midi:number,at:number,duration:number,gain:number)=>{
  const voice=c.createGain();voice.gain.setValueAtTime(0,at);voice.gain.linearRampToValueAtTime(gain,at+.18);voice.gain.exponentialRampToValueAtTime(.0001,at+duration);voice.connect(bus);
  const fundamental=c.createOscillator(),overtone=c.createOscillator(),soft=c.createGain();
  const frequency=440*2**((midi-69)/12);fundamental.type='sine';fundamental.frequency.value=frequency;overtone.type='sine';overtone.frequency.value=frequency*2;soft.gain.value=.1;
  fundamental.connect(voice);overtone.connect(soft);soft.connect(voice);fundamental.start(at);overtone.start(at);fundamental.stop(at+duration+.05);overtone.stop(at+duration+.05);
  fundamental.onended=()=>{fundamental.disconnect();overtone.disconnect();soft.disconnect();voice.disconnect();};
 };
 const schedule=()=>{
  if(c.state!=='running')return;
  if(nextBeat<c.currentTime)nextBeat=c.currentTime+.05;
  while(nextBeat<c.currentTime+.35){
   const step=musicBeat%32,chord=chords[Math.floor(step/8)];
   if(step%8===0)chord.forEach((pitch,i)=>note(pitch,nextBeat+i*.03,6.4,.18));
   note(chord[step%4]+12,nextBeat,2.6,.18);
   const lead=melody[step];if(lead!==null)note(lead,nextBeat+.08,3.6,.23);
   musicBeat++;nextBeat+=beatSeconds;
  }
 };
 schedule();musicTimer=setInterval(schedule,120);
}
export function stopBackgroundMusic(){
 if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
 const bus=musicBus;musicBus=null;
 if(bus&&context){bus.gain.cancelScheduledValues(context.currentTime);bus.gain.setTargetAtTime(0,context.currentTime,.15);setTimeout(()=>bus.disconnect(),1200);}
}
export function audioStatus(){return {context:context?.state??'locked',musicPlaying:!!musicTimer};}
export async function unlockAudio(){try{context??=new AudioContext();if(context.state==='suspended')await context.resume();}catch{}}
export function sound(kind:'select'|'match'|'error'|'win'|'start',volume:number){if(!context||volume<=0)return;const c=context;const base=c.currentTime;const master=c.createGain();master.gain.value=volume*.32;master.connect(c.destination);
const tone=(f:number,delay:number,duration:number,type:OscillatorType='sine',gain=.5)=>{const osc=c.createOscillator(),g=c.createGain();osc.type=type;osc.frequency.setValueAtTime(f,base+delay);g.gain.setValueAtTime(0,base+delay);g.gain.linearRampToValueAtTime(gain,base+delay+.008);g.gain.exponentialRampToValueAtTime(.001,base+delay+duration);osc.connect(g);g.connect(master);osc.start(base+delay);osc.stop(base+delay+duration+.03);};
if(kind==='select')tone(740,0,.1,'sine',.3);
if(kind==='error'){tone(170,0,.14,'triangle');tone(120,.08,.2,'triangle');}
if(kind==='match'){[784,1175,1568,2093].forEach((f,i)=>tone(f,i*.034,.34,'sine',.65-i*.09));tone(110,0,.15,'triangle',.7);const length=c.sampleRate*.18,buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3);const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();src.buffer=buffer;filter.type='highpass';filter.frequency.value=3500;g.gain.value=.25;src.connect(filter);filter.connect(g);g.connect(master);src.start(base);}
if(kind==='win'||kind==='start')[523,659,784,1047,1319].forEach((f,i)=>tone(f,i*.095,.6,'triangle',.35));setTimeout(()=>master.disconnect(),1800);}
