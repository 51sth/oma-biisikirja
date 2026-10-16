import {firebaseConfig} from './firebase-config.js';
const box=document.getElementById('accountGate');
const status=document.getElementById('accountStatus');
const app=document.getElementById('appShell');
const login=document.getElementById('accountLogin');
const register=document.getElementById('accountRegister');
const logout=document.getElementById('accountLogout');
const importButton=document.getElementById('accountImport');
const localKey='oma-biisikirja-v1';
const validConfig=!!(firebaseConfig.apiKey&&firebaseConfig.authDomain&&firebaseConfig.projectId&&firebaseConfig.appId);
let auth,db,uid=null,docRef=null,writeQueue=Promise.resolve(),cloudSongs=[];
const info=s=>{status.textContent=s;};
const showApp=ok=>{box.hidden=ok;app.hidden=!ok;};
showApp(false);
if(!validConfig){
  info('Kirjautuminen odottaa Firebase-asetuksia. Nykyinen julkaistu sovellus toimii normaalisti.');
  login.disabled=register.disabled=true;
}else{
  try{
    const [{initializeApp},{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut},{getFirestore,doc,getDoc,setDoc,serverTimestamp}]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    const firebase=initializeApp(firebaseConfig);
    auth=getAuth(firebase);db=getFirestore(firebase);
    const email=()=>document.getElementById('accountEmail').value.trim();
    const password=()=>document.getElementById('accountPassword').value;
    login.onclick=async()=>{try{info('Kirjaudutaan…');await signInWithEmailAndPassword(auth,email(),password());}catch(e){info('Kirjautuminen epäonnistui: '+e.message);}};
    register.onclick=async()=>{try{info('Luodaan tunnusta…');await createUserWithEmailAndPassword(auth,email(),password());}catch(e){info('Tunnuksen luonti epäonnistui: '+e.message);}};
    logout.onclick=async()=>{showApp(false);await signOut(auth);};
    window.bkCloudPersist=()=>{
      if(!uid||!docRef)throw new Error('Kirjaudu sisään ennen tallentamista.');
      const snapshot=JSON.parse(JSON.stringify(window.bkGetSongs()));
      writeQueue=writeQueue.then(()=>setDoc(docRef,{songs:snapshot,updatedAt:serverTimestamp()})).then(()=>{document.getElementById('accountSync').textContent='Pilveen tallennettu';}).catch(error=>{document.getElementById('accountSync').textContent='Pilvitallennus epäonnistui';console.error(error);alert('Pilvitallennus ei onnistunut. Vie kappaleista JSON-varmuuskopio. '+error.message);});
      return writeQueue;
    };
    importButton.onclick=async()=>{
      if(!uid)return;
      let local=[];
      try{local=JSON.parse(localStorage.getItem(localKey)||'[]');}catch{}
      if(!Array.isArray(local)||!local.length){info('Selaimessa ei ole tuotavia kappaleita. Voit palauttaa vanhat kappaleet myös palautuskopiosta.');return;}
      if(!confirm('Yhdistetäänkö tämän selaimen '+local.length+' paikallista kappaletta pilvikirjastoon? Ota ensin JSON-varmuuskopio. Nykyisiä pilvikappaleita ei poisteta.'))return;
      const list=window.bkGetSongs().slice(),signatures=new Set(list.map(x=>x.title+'\u0000'+x.body)),ids=new Set(list.map(x=>x.id));
      for(const entry of local){
        if(!entry||typeof entry.title!=='string'||typeof entry.body!=='string')continue;
        const key=entry.title+'\u0000'+entry.body;
        if(signatures.has(key))continue;
        const song={...entry};
        if(ids.has(song.id))song.id=crypto.randomUUID();
        ids.add(song.id);signatures.add(key);list.push(song);
      }
      window.bkSetSongs(list);
      await window.bkCloudPersist();
      info('Paikalliset kappaleet yhdistetty pilvikirjastoon. Selaimen alkuperäisiä tietoja ei poistettu.');
    };
    onAuthStateChanged(auth,async user=>{
      showApp(false);uid=null;docRef=null;window.bkSetSongs([]);
      if(!user){info('Kirjaudu sisään tai luo oma käyttäjätili.');return;}
      try{
        info('Avataan yksityistä kappalekirjastoa…');
        const target=doc(db,'users',user.uid,'private','library');
        const snapshot=await getDoc(target);
        if(auth.currentUser?.uid!==user.uid)return;
        cloudSongs=snapshot.exists()&&Array.isArray(snapshot.data().songs)?snapshot.data().songs:[];
        uid=user.uid;docRef=target;
        window.bkSetSongs(cloudSongs);
        document.getElementById('accountIdentity').textContent=user.email||'Oma käyttäjätili';
        document.getElementById('accountSync').textContent='Yksityinen pilvikirjasto';
        showApp(true);
      }catch(e){info('Kirjaston avaaminen epäonnistui: '+e.message);console.error(e);}
    });
  }catch(e){info('Firebase-yhteys epäonnistui: '+e.message);}
}
