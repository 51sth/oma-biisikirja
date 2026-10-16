import {firebaseConfig} from './firebase-config.js';
const box=document.getElementById('accountGate');
const loading=document.getElementById('accountLoading');
const status=document.getElementById('accountStatus');
const app=document.getElementById('appShell');
const login=document.getElementById('accountLogin');
const register=document.getElementById('accountRegister');
const logout=document.getElementById('accountLogout');
const importButton=document.getElementById('accountImport');
const verifyBox=document.getElementById('accountVerify');
const reset=document.getElementById('accountReset');
const resend=document.getElementById('accountResend');
const check=document.getElementById('accountCheck');
const verifyLogout=document.getElementById('accountVerifyLogout');
const localKey='oma-biisikirja-v1';
const validConfig=!!(firebaseConfig.apiKey&&firebaseConfig.authDomain&&firebaseConfig.projectId&&firebaseConfig.appId);
let auth,db,uid=null,docRef=null,writeQueue=Promise.resolve(),cloudSongs=[],registering=false;
const info=s=>{status.textContent=s;};
const showLoading=()=>{loading.hidden=false;box.hidden=true;app.hidden=true;};
const showLogin=(verification=false)=>{loading.hidden=true;box.hidden=false;app.hidden=true;verifyBox.hidden=!verification;login.hidden=register.hidden=reset.hidden=verification;document.getElementById('accountEmail').disabled=verification;document.getElementById('accountPassword').disabled=verification;};
const showApp=()=>{loading.hidden=true;box.hidden=true;app.hidden=false;};
showLoading();
if(!validConfig){
  info('Kirjautuminen odottaa Firebase-asetuksia. Nykyinen julkaistu sovellus toimii normaalisti.');
  login.disabled=register.disabled=true;
  showLogin();
}else{
  try{
    const [{initializeApp},{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendEmailVerification,sendPasswordResetEmail},{getFirestore,doc,getDoc,setDoc,serverTimestamp}]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    const firebase=initializeApp(firebaseConfig);
    auth=getAuth(firebase);db=getFirestore(firebase);
    const email=()=>document.getElementById('accountEmail').value.trim();
    const password=()=>document.getElementById('accountPassword').value;
    login.onclick=async()=>{try{info('Kirjaudutaan…');await signInWithEmailAndPassword(auth,email(),password());}catch(e){info('Kirjautuminen epäonnistui: '+e.message);}};
    register.onclick=async()=>{registering=true;register.disabled=true;try{info('Luodaan tunnusta…');const credential=await createUserWithEmailAndPassword(auth,email(),password());showLogin(true);info('Tunnus luotu. Lähetetään vahvistusviestiä…');await sendEmailVerification(credential.user);info('Vahvistusviesti lähetetty. Avaa sähköpostissa oleva linkki ja palaa sen jälkeen tänne.');}catch(e){info('Tunnuksen luonti tai vahvistusviestin lähetys epäonnistui: '+e.message);if(auth.currentUser)showLogin(true);else showLogin();}finally{registering=false;register.disabled=false;}};
    reset.onclick=async()=>{const address=email();if(!address){info('Kirjoita ensin sähköpostiosoitteesi.');return;}try{await sendPasswordResetEmail(auth,address);info('Jos osoitteella on käyttäjätili, saat sähköpostiin salasanan palautusohjeen. Tarkista myös roskaposti.');}catch(e){info('Palautusviestin lähetys epäonnistui: '+e.message);}};
    resend.onclick=async()=>{try{if(!auth.currentUser)throw Error('Kirjaudu ensin sisään.');await sendEmailVerification(auth.currentUser);info('Vahvistusviesti lähetetty. Tarkista myös roskaposti.');}catch(e){info('Vahvistusviestin lähetys epäonnistui: '+e.message);}};
    check.onclick=async()=>{try{if(!auth.currentUser)throw Error('Kirjaudu ensin sisään.');await auth.currentUser.reload();if(!auth.currentUser.emailVerified){info('Sähköpostiosoitetta ei ole vielä vahvistettu. Avaa sähköpostiin tullut linkki.');return;}await auth.currentUser.getIdToken(true);info('Sähköpostiosoite vahvistettu. Avataan kirjasto…');await openCloudLibrary(auth.currentUser);}catch(e){info('Vahvistuksen tarkistus epäonnistui: '+e.message);}};
    verifyLogout.onclick=async()=>{showLoading();await signOut(auth);};
    logout.onclick=async()=>{showLoading();await signOut(auth);};
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
    async function openCloudLibrary(user){
      // Refresh account status from Firebase instead of relying on a cached session profile.
      await user.reload();
      if(!user.emailVerified){info('Sähköpostiosoitettasi ei ole vielä vahvistettu. Vahvista osoite sähköpostiin lähetetyn linkin kautta.');showLogin(true);return;}
      showLoading();
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
        showApp();
      }catch(e){info('Kirjaston avaaminen epäonnistui: '+e.message);showLogin();console.error(e);}
    }
    onAuthStateChanged(auth,async user=>{
      if(registering)return;
      showLoading();uid=null;docRef=null;window.bkSetSongs([]);
      if(!user){info('Kirjaudu sisään tai luo oma käyttäjätili.');showLogin();return;}
      await openCloudLibrary(user);
    });
  }catch(e){info('Firebase-yhteys epäonnistui: '+e.message);showLogin();}
}
