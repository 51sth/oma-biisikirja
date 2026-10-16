/* Chord data are derived from pitch classes, not guessed chord drawings.
   Standard tuning: E2 A2 D3 G3 B3 E4. Shape arrays: -1=muted, 0=open, 1..15=fret. */
(function(global){
'use strict';
const tuning=[40,45,50,55,59,64],roots={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const types={
 '':{tones:[0,4,7],essential:[0,4,7]},
 m:{tones:[0,3,7],essential:[0,3,7]},
 '5':{tones:[0,7],essential:[0,7]},
 '7':{tones:[0,4,7,10],essential:[0,4,10]},
 maj7:{tones:[0,4,7,11],essential:[0,4,11]},
 m7:{tones:[0,3,7,10],essential:[0,3,10]},
 sus2:{tones:[0,2,7],essential:[0,2,7]},
 sus4:{tones:[0,5,7],essential:[0,5,7]},
 '7sus4':{tones:[0,5,7,10],essential:[0,5,10]},
 add9:{tones:[0,2,4,7],essential:[0,2,4]},
 '6':{tones:[0,4,7,9],essential:[0,4,9]},
 m6:{tones:[0,3,7,9],essential:[0,3,9]},
 '9':{tones:[0,2,4,7,10],essential:[0,2,4,10]},
 maj9:{tones:[0,2,4,7,11],essential:[0,2,4,11]},
 m9:{tones:[0,2,3,7,10],essential:[0,2,3,10]},
 dim:{tones:[0,3,6],essential:[0,3,6]},
 dim7:{tones:[0,3,6,9],essential:[0,3,6,9]},
 m7b5:{tones:[0,3,6,10],essential:[0,3,6,10]},
 aug:{tones:[0,4,8],essential:[0,4,8]},
 // Extended/altered chords share the same pitch-class model as normal chord diagrams.
 // Qualifiers such as (no5) mean exactly that the fifth is intentionally absent.
 '13':{tones:[0,2,4,7,9,10],essential:[0,2,4,7,9,10]},
 'maj7#11':{tones:[0,4,6,7,11],essential:[0,4,6,7,11]},
 'maj7#11(no5)':{tones:[0,4,6,11],essential:[0,4,6,11]},
 '7#11':{tones:[0,4,6,7,10],essential:[0,4,6,7,10]},
 '7#11(no5)':{tones:[0,4,6,10],essential:[0,4,6,10]},
 'add#11':{tones:[0,4,6,7],essential:[0,4,6,7]},
 'add#11(no5)':{tones:[0,4,6],essential:[0,4,6]},
 '7b9':{tones:[0,1,4,7,10],essential:[0,1,4,7,10]},
 '7#9':{tones:[0,3,4,7,10],essential:[0,3,4,7,10]},
 '7b5':{tones:[0,4,6,10],essential:[0,4,6,10]},
 '7#5':{tones:[0,4,8,10],essential:[0,4,8,10]},
 'mmaj7':{tones:[0,3,7,11],essential:[0,3,7,11]},
 'madd9':{tones:[0,2,3,7],essential:[0,2,3,7]},
 'm7add11':{tones:[0,3,5,7,10],essential:[0,3,5,7,10]},
 'add11':{tones:[0,4,5,7],essential:[0,4,5,7]},
 '7add11':{tones:[0,4,5,7,10],essential:[0,4,5,7,10]},
 'maj7add11':{tones:[0,4,5,7,11],essential:[0,4,5,7,11]},
 'madd11':{tones:[0,3,5,7],essential:[0,3,5,7]},
 '7add13':{tones:[0,4,7,9,10],essential:[0,4,7,9,10]},
 'maj7add13':{tones:[0,4,7,9,11],essential:[0,4,7,9,11]},
 '6/9':{tones:[0,2,4,7,9],essential:[0,2,4,7,9]},
 '7sus2':{tones:[0,2,7,10],essential:[0,2,7,10]},
 'maj7sus2':{tones:[0,2,7,11],essential:[0,2,7,11]},
 'maj7sus4':{tones:[0,5,7,11],essential:[0,5,7,11]},
 'm11':{tones:[0,2,3,5,7,10],essential:[0,2,3,5,7,10]},
 'maj13':{tones:[0,2,4,7,9,11],essential:[0,2,4,7,9,11]}
};
// A missing fifth must not be silently drawn as a full chord. Explicit (no5)
// names provide accurate labels for less common, deliberately sparse voicings.
for(const q of ['7','maj7','m7','9','maj9','m9','add9','6','m6','7b9','7#9','7#11','7add11','maj7add11','m7add11','madd11','7add13','maj7add13','13','maj13']){
 const src=types[q];if(!src||!src.tones.includes(7))continue;
 const remaining=src.tones.filter(n=>n!==7);
 types[q+'(no5)']={tones:remaining,essential:remaining.slice()};
}
const pc=n=>(n%12+12)%12;
function pitch(name,accidental){return pc(roots[name]+(accidental==='#'?1:accidental==='b'?-1:0))}
function parse(name){
 const m=String(name).trim().match(/^([A-G])([#b]?)(.*?)(?:\/([A-G])([#b]?))?$/);
 if(!m)return null;
 const quality=m[3]==='maj'?'':(m[3]||'');if(!Object.prototype.hasOwnProperty.call(types,quality))return null;
 return {name: String(name).trim(), root:pitch(m[1],m[2]),quality,bass:m[4]?pitch(m[4],m[5]):null,...types[quality]};
}
function pitches(shape){return shape.flatMap((f,i)=>f<0?[]:[pc(tuning[i]+f)])}
function valid(name,shape){
 const ch=typeof name==='string'?parse(name):name;if(!ch||!Array.isArray(shape)||shape.length!==6)return false;
 if(shape.some(f=>!Number.isInteger(f)||f<-1||f>15))return false;
 const tones=pitches(shape);if(tones.length<Math.min(3,ch.tones.length))return false;
 const chordTones=new Set(ch.tones.map(i=>pc(ch.root+i)));
 if(!tones.every(t=>chordTones.has(t)))return false;
 if(!ch.essential.every(t=>tones.includes(pc(ch.root+t))))return false;
 const bass=shape.findIndex(f=>f>=0);return bass>=0&&(ch.bass===null||pc(tuning[bass]+shape[bass])===ch.bass);
}
// A barre can cover two or more strings on the same fret if no open strings lie between.
function fingeringCost(shape){
 const fingered=shape.map((v,i)=>({v,i})).filter(x=>x.v>0);
 let total=fingered.length,barres=0;
 const used=new Set(fingered.map(o=>o.v));
 for(const fret of used){
  const at=fingered.filter(o=>o.v===fret),low=at[0]?.i,high=at[at.length-1]?.i;
  if(at.length>1&&shape.slice(low,high+1).every(n=>n!==0&&(n<0||n>=fret))){total-=at.length-1;barres++}
 }
 return {fingers:total,barres};
}
const common={
 C:['x32010','x35553'],Cm:['x35543'],D:['xx0232','x57775'],Dm:['xx0231','x57765'],E:['022100','x79997'],Em:['022000','x79987'],F:['133211','xx3211','x87565'],Fm:['133111'],G:['320003','320033','355433'],Gm:['355333'],A:['x02220','577655'],Am:['x02210','577555'],B:['x24442','799877'],Bm:['x24432','799777'],
 B7:['x21202'],C7:['x32310'],D7:['xx0212'],E7:['020100'],A7:['x02020'],G7:['320001'],Fmaj7:['xx3210'],Cmaj7:['x32000'],Am7:['x02010'],Em7:['022030'],Dsus4:['xx0233'],Asus2:['x02200'],Gsus4:['330013']
};
const commonShapes=Object.fromEntries(Object.entries(common).map(([k,v])=>[k,v.map(s=>[...s].map(c=>c==='x'?-1:Number(c)))]));
function score(shape,ch){
 const frets=shape.filter(x=>x>0),low=frets.length?Math.min(...frets):0,high=frets.length?Math.max(...frets):0;
 const bassIndex=shape.findIndex(x=>x>=0);const bass=pc(tuning[bassIndex]+shape[bassIndex]);
 const fingers=fingeringCost(shape);
 return (high||0)*1.35 + (high-low)*2.4 + fingers.fingers*2.0 + (6-shape.filter(x=>x>=0).length)*1.5 + (bass!==ch.root?2:0) - shape.filter(x=>x===0).length*1.8 + (fingers.barres?1:0);
}
const cache=new Map();
function voicings(name){
 const ch=parse(name);if(!ch)return [];
 if(cache.has(name))return cache.get(name);
 const results=new Map(),allowed=new Set(ch.tones.map(t=>pc(ch.root+t)));
 function collect(shape,seed=false){
  if(!valid(ch,shape))return;
  const pressed=shape.filter(f=>f>0),low=Math.min(...pressed,16),high=Math.max(...pressed,0);
  if(high-low>4||fingeringCost(shape).fingers>4)return;
  const key=shape.join(',');if(!results.has(key))results.set(key,{shape:shape.slice(),seed,rank:score(shape,ch)-(seed?20:0)});
 }
 for(const seed of commonShapes[name]||[])collect(seed,true);
 for(let fret=1;fret<=12;fret++){
  const options=tuning.map((t,i)=>{
   const out=[];
   if(fret<=3&&allowed.has(pc(t)))out.push(0);
   for(let f=fret;f<=Math.min(15,fret+3);f++)if(allowed.has(pc(t+f)))out.push(f);
   return out;
  });
  for(let lowString=0;lowString<=3;lowString++)for(let highString=4;highString<=5;highString++){
   if(highString-lowString+1<3)continue;
   const shape=Array(6).fill(-1);
   function walk(i){
    if(i>highString){collect(shape);return}
    for(const f of options[i]){
     if(i===lowString&&ch.bass!==null&&pc(tuning[i]+f)!==ch.bass)continue;
     shape[i]=f;walk(i+1)
    }
    shape[i]=-1;
   }
   walk(lowString);
  }
 }
 const list=[...results.values()].sort((a,b)=>a.rank-b.rank||a.shape.join().localeCompare(b.shape.join()));
 cache.set(name,list);return list;
}
// Heuristic movement cost: this is not a fingering prescription.
// It considers fret-hand position, matching notes on strings and stretch.
function transitionCost(from,to){
 if(!Array.isArray(from)||!Array.isArray(to)||from.length!==6||to.length!==6)return Infinity;
 const validShape=s=>s.every(n=>Number.isInteger(n)&&n>=-1&&n<=15);
 if(!validShape(from)||!validShape(to))return Infinity;
 const fretted=s=>s.filter(n=>n>0);
 const pos=s=>{const f=fretted(s);return f.length?Math.min(...f):0};
 const a=pos(from),b=pos(to);
 let changes=0,travel=0,held=0;
 for(let i=0;i<6;i++){
  if(from[i]===to[i]){if(from[i]>0)held++;continue}
  changes++;
  if(from[i]>0&&to[i]>0)travel+=Math.abs(from[i]-to[i])*.32;
 }
 const current=fingeringCost(to);
 const span=fretted(to);
 const stretch=span.length?Math.max(...span)-Math.min(...span):0;
 return Number((Math.abs(a-b)*2.8+changes*.85+travel+Math.max(0,stretch-2)*.5+current.barres*.5-held*.35).toFixed(2));
}
function sameTones(a,b){return a.filter(n=>b.includes(n)).length}
const canonicalSharps=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const canonicalFlats=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
function noteName(p,flats=false){return (flats?canonicalFlats:canonicalSharps)[pc(p)]}
function inferKey(names){
 const chords=names.map(parse).filter(Boolean),candidates=[];
 // Avoid calling chromatic dominant chords "out of key": compare diatonic chord tone fit and root placement.
 for(let root=0;root<12;root++)for(const minor of [false,true]){
  const degrees=(minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(x=>pc(root+x));
  let value=0;
  for(const c of chords){
   const tones=c.tones.map(x=>pc(c.root+x));
   const missing=tones.filter(n=>!degrees.includes(n)).length;
   const rootFit=degrees.includes(c.root);
   value+=rootFit?1.5:-1.5;value+=tones.length-missing*2.2;
   if(c.root===root)value+=.7;
   // A harmonic-minor dominant V is conventional and musical.
   if(minor&&c.root===pc(root+7)&&['','7'].includes(c.quality))value+=3;
  }
  candidates.push({root,minor,score:value});
 }
 candidates.sort((a,b)=>b.score-a.score);
 const [best,second]=candidates;return {...best,confidence:best.score-second.score>4?'melko selvä':'suuntaa antava'};
}
function substitutions(name,allNames,forcedKey,neighbors={}){
 const current=parse(name);if(!current)return {key:null,list:[]};
 const key=forcedKey || inferKey(allNames.length?allNames:[name]);
 const scale=(key.minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(d=>pc(key.root+d));
 const harmonicMinor=key.minor?[0,2,3,5,7,8,11].map(d=>pc(key.root+d)):null;
 function functionGroup(root){
  const degree=pc(root-key.root);
  const tonic=key.minor?[0,3,8]:[0,4,9];
  const predominant=key.minor?[2,5]:[2,5];
  return tonic.includes(degree)?'tonic':predominant.includes(degree)?'predominant':[7,11].includes(degree)?'dominant':'other';
 }
 const oldFunction=functionGroup(current.root);
 const variants=['','m','7','maj7','m7','sus2','sus4','add9','6','m6','9','dim','m7b5'];
 const originalTones=current.tones.map(x=>pc(current.root+x));
 const suggestions=[];
 for(let root=0;root<12;root++)for(const q of variants){
  const n=noteName(root,[8,10,3,1,6].includes(key.root))+q;
  if(n===name)continue;
  const target=parse(n);if(!target)continue;
  const tones=target.tones.map(d=>pc(target.root+d));
  const overlap=sameTones(tones,originalTones);
  const ordinary=tones.every(t=>scale.includes(t));
  const alteredMinorDominant=key.minor&&root===pc(key.root+7)&&['','7'].includes(q)&&tones.every(t=>harmonicMinor.includes(t));
  const alteredMinorLeading=key.minor&&root===pc(key.root+11)&&['dim','dim7'].includes(q)&&tones.every(t=>harmonicMinor.includes(t));
  const allInKey=ordinary||alteredMinorDominant||alteredMinorLeading;
  const retainedRoot=root===current.root;
  // Strong harmonic relation: shared tones, or a quality variation with same root.
  if(!retainedRoot&&overlap<2)continue;
  if(!allInKey&&!retainedRoot)continue;
  if(!voicings(n).length)continue;
  let rating=overlap*5+(retainedRoot?9:0)+(allInKey?6:0)-Math.abs(tones.length-originalTones.length)*1.3;
  if(!retainedRoot){
   if(oldFunction!=='other'&&functionGroup(root)===oldFunction)rating+=5;
   else if(oldFunction!=='other')rating-=3;
   for(const neighbor of [neighbors.previous,neighbors.next]){
    const adjacent=parse(neighbor||'');
    if(adjacent){const ntones=adjacent.tones.map(x=>pc(adjacent.root+x));rating+=Math.min(2,sameTones(tones,ntones))*.55}
   }
  }
  // Sus/add colour versus genuine harmonic substitution.
  let reason=retainedRoot?'Sama pohjasävel, eri sointiväri':overlap>=3?'Paljon yhteisiä säveliä':'Yhteisiä säveliä ja sävellajiin sopiva';
  suggestions.push({name:n,reason,rating,allInKey});
 }
 suggestions.sort((a,b)=>Number(b.allInKey)-Number(a.allInKey)||b.rating-a.rating||a.name.localeCompare(b.name));
 const chosen=[],seen=new Set();
 for(const v of suggestions){if(seen.has(v.name))continue;seen.add(v.name);chosen.push(v);if(chosen.length>=14)break}
 return {key,list:chosen};
}
function searchNames(query){
 const q=String(query||'').trim();
 if(q){const exact=parse(q);if(exact)return [exact.name];}
 const rootNames=['C','C#','Db','D','Eb','E','F','F#','Gb','G','Ab','A','Bb','B'];
 const names=[];
 for(const root of rootNames)for(const quality of ['','m','7','maj7','m7','sus2','sus4','7sus4','add9','add11','madd11','7add11','maj7add11','m7add11','7add13','maj7add13','6','m6','9','maj9','m9','dim','dim7','m7b5','aug','5']){const n=root+quality;if(!q||n.toLowerCase().includes(q.toLowerCase()))names.push(n)}
 return names.slice(0,120);
}
global.ChordEngine={parse,valid,voicings,pitches,score,inferKey,substitutions,searchNames,noteName,fingeringCost,transitionCost,qualities:Object.keys(types)};
})(window);
