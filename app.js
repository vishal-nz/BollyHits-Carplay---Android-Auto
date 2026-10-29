'use strict';
const STATIONS=[
 {label:'BollyHits Radio',api:'https://az13.yesstreaming.net/api/nowplaying/163'},
 {label:'BollyHits GOLD',api:'https://radio.bollyhitsradio.com/api/nowplaying/1'},
 {label:'BollyHits JOY',api:'https://radio.bollyhitsradio.com/api/nowplaying/4'},
 {label:'Nadeem Shravan Melodies',api:'https://radio.bollyhitsradio.com/api/nowplaying/2'},
 {label:'DesiZone Radio',type:'desizone',radio:1,landing:'https://www.desizoneradio.com/'},
 {label:'Desi Hits 2000s',type:'desizone',radio:2,landing:'https://www.desizoneradio.com/2000s'},
 {label:'Nostalgic Bollywood 90s',type:'desizone',radio:3,landing:'https://www.desizoneradio.com/90s'}
];
const $=id=>document.getElementById(id);let selected=0,now=null,playing=false,seq=0,context=null,source=null,bassFilter=null,clarityFilter=null,compressor=null,eqReady=false,eqAttempted=false,userWantsPlayback=false,interrupted=false,resumePending=false;const audio=$('audio');
const safe=(v,f='')=>v===undefined||v===null||v===''?f:String(v);
const time=s=>{s=Math.max(0,Math.floor(Number(s)||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
function listenerCount(data){const v=data?.listeners?.current;return Number.isFinite(Number(v))&&v!==undefined&&v!==null?`${v} Listeners`:'Listeners unavailable'}
function stationName(data){return STATIONS[selected].label} // Keep branded station labels stable.
const ROTATION_MS=10000;
// Fill in authorized DesiZone stream URLs below. Metadata API does not supply streams.
const DESIZONE_STREAMS={1:'',2:'',3:''};
function normalizedDesizone(payload, station){const item=Array.isArray(payload)?payload[0]:payload?.data?.[0]||payload?.data||payload; if(!item||typeof item!=='object')throw Error('Empty DesiZone response');const duration=Number(item.durationsec)||Math.floor((Number(item.duration)||0)/1000);const playedAt=Date.parse(item.played||'')/1000;return {station:{listen_url:DESIZONE_STREAMS[station.radio]||null},listeners:{current:null},now_playing:{song:{id:item.ID,title:item.title,artist:item.artist,album:item.album,art:item.albumart,duration},duration,played_at:Number.isFinite(playedAt)?playedAt:0}}}
let rotationIndex=0;
function customField(data){
 const song=data?.now_playing?.song||{};
 const fields=song.custom_fields??data?.now_playing?.custom_fields??{};
 // AzuraCast custom_fields is commonly a map, sometimes a list of {name,value}.
 let value=song.custom_field??data?.now_playing?.custom_field;
 if(value==null||value===''){
  if(Array.isArray(fields))value=fields.find(x=>x&&x.value!=null&&String(x.value).trim())?.value;
  else if(fields&&typeof fields==='object')value=Object.values(fields).find(x=>x!=null&&String(x).trim());
 }
 return value == null || !String(value).trim() ? null : String(value).trim();
}
function metadataValues(data){
 const song=data?.now_playing?.song||{};
 if(STATIONS[selected].type==='desizone')return [safe(song.album,'Album unavailable'),stationName(data)];
 const values=[safe(song.album,'Album unavailable')];
 const custom=customField(data);
 if(custom)values.push(custom);
 values.push(listenerCount(data),stationName(data));
 return values;
}
function albumText(data){const values=metadataValues(data);return values[rotationIndex%values.length];}
function getArtwork(song){const url=safe(song?.art);return /^https:\/\//i.test(url)?url:new URL('icon.svg',location.href).href}
function mediaUpdate(){if(!('mediaSession' in navigator))return;const song=now?.now_playing?.song||{};const artwork=getArtwork(song);navigator.mediaSession.metadata=new MediaMetadata({title:safe(song.title,STATIONS[selected].label),artist:safe(song.artist,'BollyHits / DesiZone Network'),album:albumText(now),artwork:[{src:artwork}]});navigator.mediaSession.playbackState=playing?'playing':'paused';positionUpdate()}
function positionUpdate(){const n=now?.now_playing;if(!n)return;const duration=Number(n.duration||n.song?.duration||0),playedAt=Number(n.played_at||0);if(!(duration>0&&playedAt>0))return;const elapsed=Math.min(duration,Math.max(0,Date.now()/1000-playedAt));if('mediaSession'in navigator&&typeof navigator.mediaSession.setPositionState==='function'){try{navigator.mediaSession.setPositionState({duration,playbackRate:1,position:elapsed})}catch(e){/* live streams may reject position */}}}
function updateProgress(){const n=now?.now_playing;const duration=Number(n?.duration||n?.song?.duration||0),playedAt=Number(n?.played_at||0);let elapsed=0;if(duration>0&&playedAt>0)elapsed=Math.min(duration,Math.max(0,Date.now()/1000-playedAt));const pct=duration>0?Math.min(100,Math.round(100*elapsed/duration)):0;$('fill').style.width=pct+'%';$('progress').setAttribute('aria-valuenow',String(pct));$('elapsed').textContent=time(elapsed)+' elapsed';$('remaining').textContent=duration>0?'-'+time(duration-elapsed)+' remaining':'LIVE • duration unknown';positionUpdate()}
function streamUrl(data){const mounts=Array.isArray(data?.station?.mounts)?data.station.mounts:[];const u=data?.station?.listen_url||mounts.find(m=>m?.is_default)?.url||mounts[0]?.url;return typeof u==='string'&&/^https:\/\//i.test(u)?u:null}
function rotateMetadata(){rotationIndex=(rotationIndex+1)%metadataValues(now).length;$('stationLine').textContent=albumText(now);mediaUpdate()}
function render(){const song=now?.now_playing?.song||{};$('title').textContent=safe(song.title,'Live Radio');$('artist').textContent=safe(song.artist,'BollyHits Radio Network');$('stationLine').textContent=albumText(now);$('cover').src=getArtwork(song);$('cover').onerror=()=>{$('cover').onerror=null;$('cover').src='icon.svg'};updateProgress();mediaUpdate()}
async function refresh(){const id=selected,token=++seq;try{const station=STATIONS[id];const endpoint=station.type==='desizone'?`./api/desizone-playing?radio=${station.radio}`:station.api;const response=await fetch(endpoint,{cache:'no-store'});if(!response.ok)throw Error('API HTTP '+response.status);const raw=await response.json();const data=station.type==='desizone'?normalizedDesizone(raw,station):raw;if(id!==selected||token!==seq)return;const previous=now?.now_playing?.song?.id;now=data;render();if(playing&&!audio.src){const u=streamUrl(data);if(u){audio.src=u;await startAudio()}}if(previous&&previous!==data?.now_playing?.song?.id)updateProgress()}catch(e){if(id!==selected||token!==seq)return;$('status').textContent='Metadata temporarily unavailable; audio may still work.';console.warn('Metadata fetch failed:',e)}}
function drawStations(){const root=$('stations');root.replaceChildren();STATIONS.forEach((s,i)=>{const b=document.createElement('button');b.className='station'+(i===selected?' active':'');b.type='button';b.textContent=s.label;const sub=document.createElement('small');sub.textContent='Tap to tune in';b.appendChild(sub);b.setAttribute('aria-pressed',String(i===selected));b.onclick=()=>selectStation(i,true);root.appendChild(b)})}
async function selectStation(i,autoplay){if(autoplay)userWantsPlayback=true;const wasPlaying=playing;selected=(i+STATIONS.length)%STATIONS.length;rotationIndex=0;seq++;now=null;audio.pause();audio.removeAttribute('src');audio.load();playing=false;$('play').textContent='▶';$('title').textContent='Loading station…';$('artist').textContent=STATIONS[selected].label;$('stationLine').textContent=STATIONS[selected].label;$('cover').src='icon.svg';drawStations();await refresh();if(autoplay||wasPlaying)await startAudio()}
async function startAudio(){const u=streamUrl(now);if(!u){$('status').textContent=STATIONS[selected].type==='desizone'?'DesiZone audio URL not configured. Add authorized stream URLs in app.js.':'Stream URL not yet available; retry after metadata loads.';return}if(!audio.src||audio.currentSrc!==u&&audio.src!==u){audio.src=u}try{await audio.play();playing=true;interrupted=false;resumePending=false;$('play').textContent='⏸';$('status').textContent='Playing '+STATIONS[selected].label;mediaUpdate()}catch(e){playing=false;$('play').textContent='▶';$('status').textContent='Unable to start audio: check stream availability / CORS.';console.warn('Playback error:',e)}}
async function toggle(){if(playing){userWantsPlayback=false;interrupted=false;resumePending=false;audio.pause();playing=false;$('play').textContent='▶';$('status').textContent='Paused';mediaUpdate()}else{userWantsPlayback=true;if(!now)await refresh();await startAudio()}}
$('play').onclick=toggle;$('prev').onclick=()=>selectStation(selected-1,true);$('next').onclick=()=>selectStation(selected+1,true);audio.addEventListener('error',()=>{$('status').textContent='Stream error: verify URL and CORS settings.'});
if('mediaSession'in navigator){for(const [action,handler] of Object.entries({play:()=>{userWantsPlayback=true;return startAudio()},pause:()=>togglePause(),previoustrack:()=>selectStation(selected-1,true),nexttrack:()=>selectStation(selected+1,true)})){try{navigator.mediaSession.setActionHandler(action,handler)}catch(e){}}}
function togglePause(){if(playing)toggle()}
// Phone calls can interrupt audio. Resume only when the listener had been playing;
// browsers/OS may prohibit unattended playback after a call.
async function tryResume(){if(!userWantsPlayback||!interrupted||document.hidden||resumePending)return;resumePending=true;try{if(!now)await refresh();await startAudio()}finally{resumePending=false;if(interrupted)$('status').textContent='Call ended? Tap Play to resume (device may require interaction).'}}
audio.addEventListener('pause',()=>{if(userWantsPlayback){interrupted=true;playing=false;$('play').textContent='▶';mediaUpdate()}});
audio.addEventListener('playing',()=>{if(userWantsPlayback){playing=true;interrupted=false;$('play').textContent='⏸';mediaUpdate()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tryResume()});
window.addEventListener('pageshow',tryResume);window.addEventListener('focus',tryResume);
audio.addEventListener('ended',()=>{if(userWantsPlayback){interrupted=true;tryResume()}});
drawStations();refresh();setInterval(()=>{refresh()},15000);setInterval(updateProgress,1000);setInterval(rotateMetadata,ROTATION_MS);
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
