/* Sointutunnistin: käyttää biisikirjan ChordEngine-tietokannan säveljoukkoja.
   Vakioviritys E A D G B e, -1 = vaimennettu, 0 = avoin, 1..15 = painettu nauha. */
(function (global) {
  'use strict';
  const tuning = [40, 45, 50, 55, 59, 64];
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const qualities = ['', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', '7sus4', 'add9', '6', 'm6', '9', 'maj9', 'm9', 'dim', 'dim7', 'm7b5', 'aug', '5'];
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
    const score = e => (e.rootBass?100:0) - e.missing*35 - (e.quality === '5'?12:0) + (e.quality===''||e.quality==='m'?8:0);
    for (const list of [matches,partial]) list.sort((a,b)=>score(b)-score(a)||a.name.length-b.name.length||a.name.localeCompare(b.name));
    return {status:matches.length?'exact':partial.length?'partial':'unknown',notes:names,bass:labels[bass],matches,partial};
  }
  global.ChordFinder={identify,tuning:tuning.slice(),roots:roots.slice(),qualities:qualities.slice()};
})(window);
