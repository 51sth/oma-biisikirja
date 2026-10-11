/* Sointutunnistin: käyttää biisikirjan ChordEngine-tietokannan säveljoukkoja.
   Vakioviritys E A D G B e, -1 = vaimennettu, 0 = avoin, 1..15 = painettu nauha. */
(function (global) {
  'use strict';
  const tuning = [40, 45, 50, 55, 59, 64];
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  // Single source of truth: the exact same qualities used by the song chord engine.
  const qualities = global.ChordEngine.qualities;
  const pitchOfNatural = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const pc = value => (value % 12 + 12) % 12;
  const sameSet = (a,b) => a.size === b.size && [...a].every(note => b.has(note));
  const digitDegree = {0:0,2:1,3:2,4:2,5:3,6:4,7:4,8:4,9:5,10:6,11:6};
  function spelledBass(rootName, parsed, bass) {
    const interval = pc(bass - parsed.root);
    const degree = digitDegree[interval];
    if (degree === undefined) return global.ChordEngine.noteName(bass);
    const letter = letters[(letters.indexOf(rootName[0]) + degree) % 7];
    const delta = pc(bass - pitchOfNatural[letter]);
    const offset = delta > 6 ? delta - 12 : delta;
    if (offset < -2 || offset > 2) return global.ChordEngine.noteName(bass);
    return letter + (offset === 2?'##':offset === 1?'#':offset === -1?'b':offset === -2?'bb':'');
  }
  // Sama ChordEngine.parse kuin sointukaavioilla: ei erillistä arvaavaa tietokantaa.
  const catalogue = roots.flatMap(root => qualities.map(q => {
    const name = root + q, parsed = global.ChordEngine.parse(name);
    return parsed ? {name, parsed, tones:new Set(parsed.tones.map(n=>pc(parsed.root + n)))} : null;
  }).filter(Boolean));
  const labels = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  // Spell exact chord tones relative to their harmonic root. The third of A7 is C#, not Db.
  function spellChordTone(note, rootName, parsed) {
    const interval = pc(note - parsed.root);
    let degree = digitDegree[interval];
    if (interval === 6 && parsed.quality.includes('#11')) degree = 3;
    if (interval === 3 && parsed.quality.includes('#9')) degree = 1;
    if (degree === undefined) return global.ChordEngine.noteName(note);
    const letter = letters[(letters.indexOf(rootName[0]) + degree) % 7];
    const natural = pitchOfNatural[letter];
    const difference = pc(note - natural);
    const alteration = difference > 6 ? difference - 12 : difference;
    if (alteration < -2 || alteration > 2) return global.ChordEngine.noteName(note);
    return letter + (alteration === 2 ? '##' : alteration === 1 ? '#' : alteration === -1 ? 'b' : alteration === -2 ? 'bb' : '');
  }
  function identify(shape) {
    if (!Array.isArray(shape) || shape.length !== 6 || shape.some(n=>!Number.isInteger(n)||n < -1||n > 15)) {
      return {status:'invalid', notes:[], matches:[], partial:[]};
    }
    const played=shape.flatMap((f,i)=>f<0?[]:[pc(tuning[i]+f)]);
    const tones=new Set(played);
    const names=[...tones].sort((a,b)=>a-b).map(p=>labels[p]);
    if (played.length===0) return {status:'empty',notes:[],matches:[],partial:[]};
    const bass=played[0];
    if (tones.size<2) return {status:'few',notes:names,matches:[],partial:[]};
    const matches=[],partial=[];
    for (const item of catalogue) {
      const {parsed,tones:expected,name}=item;
      const missing=[...expected].filter(p=>!tones.has(p));
      const exact=missing.length===0&&sameSet(tones,expected);
      let isPartial=false;
      if(!exact && tones.size>=2 && [...tones].every(n=>expected.has(n)) && tones.has(parsed.root)) {
        const essential=new Set(parsed.essential.map(d=>pc(parsed.root+d)));
        const essentialPresent=[...essential].filter(t=>tones.has(t)).length;
        // Näytä vajaat soinnut vain ehdotuksina, ei koskaan varmoina tuloksina.
        // Kaksi soivaa säveltä: enintään yksi puuttuva; kolme: enintään kaksi.
        // Pohjasävel + riittävän monta tunnistavaa säveltä pitää löytyä.
        const maximumMissing=tones.size>=3?2:1;
        isPartial=missing.length>0 && missing.length<=maximumMissing && essentialPresent>=2;
      }
      if (!exact && !isPartial) continue;
      const inversion=bass!==parsed.root;
      const display=name+(inversion?'/'+spelledBass(name,parsed,bass):'');
      const descriptor=isPartial?' (vajaasointu)':'';
      const entry={name:display+descriptor,root:name,quality:parsed.quality,rootBass:!inversion,missing:missing.length,missingNames:missing.map(n=>labels[n]),notes:[...expected]};
      (exact?matches:partial).push(entry);
    }
    const score = e => (e.rootBass?100:0) - e.missing*35 - (e.quality === '5'?12:0) + (e.quality===''||e.quality==='m'?8:0) - (e.quality.includes('no5')?4:0);
    for (const list of [matches,partial]) list.sort((a,b)=>score(b)-score(a)||a.name.length-b.name.length||a.name.localeCompare(b.name));
    const preferred = matches[0];
    let displayNotes = names;
    if (preferred) {
      const rootName = preferred.root.match(/^[A-G][#b]?/)[0];
      const parsed = global.ChordEngine.parse(preferred.root);
      displayNotes = [...tones].sort((a,b)=>pc(a-parsed.root)-pc(b-parsed.root))
        .map(note=>spellChordTone(note,rootName,parsed));
    }
    return {status:matches.length?'exact':partial.length?'partial':'unknown',notes:displayNotes,bass:labels[bass],matches,partial};
  }
  // UI:n automaattiset kielet (-2) eivät ole oletusarvoisesti avoimia eivätkä
  // vaimennettuja. Muodostetaan niiden mielekkäät vaihtoehdot, eikä arvata
  // sellaisen kielen soivan, jota soittaja ei ole määrittänyt.
  // Tulkinnat ovat aina ChordEngine.parse-mallin tarkistamia säveljoukkoja.
  function identifyFlexible(input) {
    if (!Array.isArray(input) || input.length !== 6 ||
        input.some(f => !Number.isInteger(f) || f < -2 || f > 15)) {
      return {status:'invalid',matches:[],notes:[],partial:[],options:[]};
    }
    const auto=[];
    for(let i=0;i<6;i++) if(input[i]===-2) auto.push(i);
    const hasUserNotes=input.some(f=>f>0 || f===0);
    if(!hasUserNotes) return {status:'waiting',matches:[],notes:[],partial:[],options:[]};
    if(!auto.length) {
      const result=identify(input);
      return {...result,options:result.matches.map(match=>({...match,shape:input.slice(),inferred:0}))};
    }
    const possibles=new Map();
    const partials=new Map();
    for(let mask=0;mask<(1<<auto.length);mask++) {
      const resolved=input.slice();
      let open=0,muted=0;
      auto.forEach((i,j)=>{
        if(mask&(1<<j)){resolved[i]=0;open++}else{resolved[i]=-1;muted++}
      });
      const result=identify(resolved);
      for(const m of result.matches){
        const rank=(m.rootBass?80:0) + open*6 - muted*7 +
          (m.quality===''||m.quality==='m'?7:0) -
          ((m.quality||'').length>3?2:0);
        const found=possibles.get(m.name);
        if(!found || rank>found.rank) possibles.set(m.name,{...m,shape:resolved.slice(),inferred:auto.length,autoOpen:open,rank});
      }
      // Vajaasoinnut jätetään selvästi erilleen, ei ylennetä täsmällisiksi.
      if (!result.matches.length) for(const m of result.partial){
        const rank=(m.rootBass?30:0) + open*3 - muted*6 - 15*m.missing;
        const found=partials.get(m.name);
        if(!found||rank>found.rank) partials.set(m.name,{...m,shape:resolved.slice(),rank});
      }
    }
    const options=[...possibles.values()].sort((a,b)=>b.rank-a.rank || a.name.length-b.name.length || a.name.localeCompare(b.name));
    const closest=[...partials.values()].sort((a,b)=>b.rank-a.rank).slice(0,6);
    if(options.length){
      const first=options[0];
      return {status:options.length===1?'exact':'ambiguous',matches:options,options,
        notes:identify(first.shape).notes,bass:identify(first.shape).bass,
        partial:[],inferred:true};
    }
    return {status:closest.length?'partial':'unknown',matches:[],options:[],partial:closest,
      notes:identify(input.map(x=>x===-2?-1:x)).notes,inferred:true};
  }
  global.ChordFinder={identify,identifyFlexible,tuning:tuning.slice(),roots:roots.slice(),qualities:qualities.slice()};
})(window);
