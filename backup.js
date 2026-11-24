(async function () {
  'use strict';
  const {createClient} = await import(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const db = createClient(
    'https://nycwwzrtpswsngsghgiz.supabase.co',
    'sb_publishable_AMFCbul5u3fkOBEQSCN8-Q_3AHabftt',
    {auth:{storageKey:'jf-cloud-auth'}});
  const relevant = k => /^(wys12_|jf_split_|jf_cycle_)/.test(k)
    || ['wys_week','wys_day','jf_active_program'].includes(k);
  const snapshot = () => Object.fromEntries(Object.keys(localStorage)
    .filter(relevant).sort().map(k=>[k,localStorage.getItem(k)]));
  const equal = (a,b) => JSON.stringify(Object.entries(a||{}).sort())
    === JSON.stringify(Object.entries(b||{}).sort());
  let busy=false, warned=false, blocked=false;
  function warn(message) {
    if (!warned) { warned=true; alert(message); }
  }
  async function login() {
    const dialog=document.createElement('dialog');
    dialog.style.cssText='width:90%;max-width:360px;border:0;'+
      'border-radius:14px;padding:20px;color:#142337';
    dialog.innerHTML='<form><h2>Connexion JF Training</h2>'+ 
      '<p>Une seule connexion pour activer la sauvegarde automatique.</p>'+ 
      '<input type="email" autocomplete="username" placeholder="E-mail" required>'+ 
      '<input type="password" autocomplete="current-password" '+
      'placeholder="Mot de passe" required><p role="status"></p>'+ 
      '<button type="submit">Connexion</button> '+
      '<button type="button">Plus tard</button></form>';
    for(const input of dialog.querySelectorAll('input'))
      input.style.cssText='width:100%;padding:10px;margin:5px 0';
    document.body.append(dialog);
    return new Promise(resolve=>{
      const form=dialog.querySelector('form');
      dialog.addEventListener('close',()=>{dialog.remove();resolve();});
      form.querySelector('[type=button]').onclick=()=>dialog.close();
      form.onsubmit=async e=>{
        e.preventDefault();
        const [email,password]=form.querySelectorAll('input');
        const button=form.querySelector('[type=submit]');
        button.disabled=true;
        try {
          const {error}=await db.auth.signInWithPassword({
            email:email.value.trim(),password:password.value});
          if(error)throw error;
          password.value='';dialog.close();
        }catch(err){form.querySelector('[role=status]').textContent=
          'Connexion impossible. Vérifie tes identifiants.';}
        finally{button.disabled=false;}
      };
      dialog.showModal();
    });
  }
  async function sync() {
    if(busy||blocked||!navigator.onLine)return;
    busy=true;
    try {
      const {data:auth,error:authError}=await db.auth.getSession();
      if(authError)throw authError;
      const user=auth.session?.user;
      if(!user)return;
      const key='jf_cloud_base_'+user.id;
      const base=JSON.parse(localStorage.getItem(key)||'null');
      const {data:r,error}=await db.from('jf_training_backup')
        .select('data,updated_at').eq('user_id',user.id).maybeSingle();
      if(error)throw error;
      const local=snapshot(), remote=r?.data||{};
      if(Object.entries(remote).some(([k,v])=>!relevant(k)||
        typeof v!=='string'))throw Error('Format distant invalide');
      const merged={};
      const keys=new Set([...Object.keys(local),...Object.keys(remote),
        ...Object.keys(base||{})]);
      for(const k of keys){
        const l=local[k], d=remote[k], b=base?.[k];
        let v;
        if(l===d)v=l;
        else if(!base){
          if(l===undefined)v=d;
          else if(d===undefined)v=l;
          else if(['wys_week','wys_day','jf_active_program',
            'jf_split_week','jf_split_day'].includes(k))v=d;
          else {blocked=true;break;}
        }else if(l===b)v=d;
        else if(d===b)v=l;
        else {blocked=true;break;}
        if(v!==undefined)merged[k]=v;
      }
      if(blocked){warn('Deux versions différentes existent. '+
        'Aucune donnée ne sera écrasée. Contacte ton assistance.');return;}
      if(!equal(local,snapshot()))return;
      if(!equal(merged,remote)){
        const row={user_id:user.id,data:merged,
          updated_at:new Date().toISOString()};
        const result=r?await db.from('jf_training_backup').update(row)
          .eq('user_id',user.id).eq('updated_at',r.updated_at)
          .select('updated_at').single():await db.from('jf_training_backup')
          .insert(row).select('updated_at').single();
        if(result.error)throw result.error;
      }
      if(!equal(local,snapshot()))return;
      if(!equal(local,merged)){
        localStorage.setItem('jf_cloud_previous_local',JSON.stringify(local));
        for(const k of Object.keys(local))if(!(k in merged))
          localStorage.removeItem(k);
        for(const [k,v] of Object.entries(merged))localStorage.setItem(k,v);
        localStorage.setItem(key,JSON.stringify(merged));
        location.reload();return;
      }
      localStorage.setItem(key,JSON.stringify(merged));
      warned=false;
    }catch(err){console.error('JF Training sauvegarde',err);}
    finally{busy=false;}
  }
  const {data,error}=await db.auth.getSession();
  if(error)throw error;
  if(!data.session && navigator.onLine)await login();
  // Cycles independants : archivage distant avant remise a zero.
  const isSplit = location.pathname.endsWith('/split.html');
  const program = isSplit ? 'split' : 'haut_bas';
  const belongs = k => isSplit ? k.startsWith('jf_split_') :
    k.startsWith('wys12_') || ['wys_week','wys_day'].includes(k);
  async function newCycle() {
    if (busy || blocked || !navigator.onLine) {
      alert('Sauvegarde indisponible. Reessaie dans un instant.'); return;
    }
    if (!confirm('Archiver ce cycle et repartir en semaine 1 ?')) return;
    busy = true;
    const cover = document.createElement('dialog');
    cover.textContent = 'Archivage et verification en cours...';
    cover.addEventListener('cancel', e => e.preventDefault());
    document.body.append(cover); cover.showModal();
    try {
      const {data:auth,error:ae} = await db.auth.getUser();
      if (ae || !auth.user) throw Error('Connexion requise');
      const uid = auth.user.id, baseKey = 'jf_cloud_base_'+uid;
      const local = snapshot();
      const {data:r,error:re} = await db.from('jf_training_backup')
        .select('data,updated_at').eq('user_id',uid).single();
      if (re) throw re;
      if (!equal(local,r.data)) throw Error('Attends la synchronisation puis reessaie.');
      const archive = Object.fromEntries(Object.entries(local)
        .filter(([k]) => belongs(k)));
      const prefix = 'jf_cycle_'+program+'_';
      const id = prefix+crypto.randomUUID();
      const next = {...local};
      next[id] = JSON.stringify({date:new Date().toISOString(),data:archive});
      // Conserver aussi une copie locale avant toute ecriture distante.
      localStorage.setItem('jf_cloud_cycle_recovery',JSON.stringify(local));
      for (const k of Object.keys(archive)) delete next[k];
      next[isSplit?'jf_split_week':'wys_week']='1';
      next[isSplit?'jf_split_day':'wys_day']='0';
      if (!equal(local,snapshot())) throw Error('Donnees modifiees. Reessaie.');
      const {data:saved,error:se} = await db.from('jf_training_backup')
        .update({data:next,updated_at:new Date().toISOString()})
        .eq('user_id',uid).eq('updated_at',r.updated_at)
        .select('data').single();
      if (se || !equal(saved?.data,next)) throw Error('Archivage non confirme');
      if (!equal(local,snapshot())) {
        blocked=true; throw Error('Donnees locales modifiees. Ne rien effacer.');
      }
      // Ecrire l archive avant de retirer les anciennes saisies.
      localStorage.setItem(id,next[id]);
      for (const k of Object.keys(archive)) localStorage.removeItem(k);
      for (const [k,v] of Object.entries(next)) localStorage.setItem(k,v);
      localStorage.setItem(baseKey,JSON.stringify(next));
      location.reload();
    } catch(e) {
      alert('Cycle non termine : '+e.message);
    } finally { cover.close(); cover.remove(); busy=false; }
  }

  // Consultation en lecture seule : aucune restauration ni modification.
  const splitNames = [["Développé couché barre", "Développé incliné haltères 30°", "Dips lestés", "Écartés à la poulie", "Chest press convergente", "Extension triceps au-dessus de la tête", "Extension triceps corde"], ["Squat barre chargé", "Hack squat", "Presse à cuisses", "Leg extension", "Fentes bulgares", "Mollets debout", "Mollets assis"], ["Tractions lestées", "Rowing poitrine appuyée", "Tirage vertical prise neutre", "Rowing unilatéral poulie", "Curl incliné haltères", "Curl pupitre", "Curl marteau"], ["Deadlift classique", "Hip thrust barre", "Leg curl assis", "Nordic curl assisté", "Leg curl allongé", "Abducteurs machine", "Crunch poulie haute", "Relevés de genoux suspendu"], ["Développé épaules machine", "Élévations latérales poulie", "Oiseau machine", "Face pull", "Développé incliné machine", "Rowing machine", "Pompes classiques"]];
  function archives() {
    return Object.entries(snapshot()).filter(([k])=>k.startsWith('jf_cycle_'+program+'_'))
      .flatMap(([id,v])=>{try {const a=JSON.parse(v);return a.data && typeof a.data==='object' ? [{...a,id}] : [];}catch{return [];}})
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  }
  function archiveDate(a) {return new Date(a.date).toLocaleString('fr-FR');}
  function rowsFor(a) {
    const rows=new Map(), other=[];
    for(const [key,value] of Object.entries(a.data)) {
      const m=key.match(/^(?:wys12_|jf_split_)(\d+)_(\d+)_(\d+)_(\d+)_(kg|reps|done)$/);
      if(!m){if(!['wys_week','wys_day','jf_split_week','jf_split_day'].includes(key))other.push([key,value]);continue;}
      const [,w,d,i,s,f]=m;
      const id=[w,d,i,s].join('_');
      if(!rows.has(id)) {
        let name='Exercice '+(Number(i)+1);
        try {name=(isSplit?splitNames[Number(d)]?.[Number(i)]:getExercises(Number(w),Number(d))[Number(i)]?.name)||name;}catch{}
        rows.set(id,{w:+w,d:+d,i:+i,s:+s,name});
      }
      rows.get(id)[f]=value;
    }
    return {series:[...rows.values()].sort((a,b)=>a.w-b.w||a.d-b.d||a.i-b.i||a.s-b.s),other};
  }
  function exportArchive(a) {
    const {series,other}=rowsFor(a);
    const days=isSplit?['Lundi','Mardi','Mercredi','Jeudi','Vendredi']:['Lundi','Mardi','Jeudi','Vendredi','Samedi'];
    const rows=[['Semaine','Jour','Exercice','Serie','Charge kg','Repetitions','Terminee','Autre donnee','Valeur'],...series.map(r=>[r.w,days[r.d],r.name,r.s+1,r.kg??'',r.reps??'',r.done==='1'?'Oui':'Non','','']),...other.map(([k,v])=>['','','','','','','',k,v])];
    const cell=v=>{let t=String(v??'');if(/^[=+@-]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='JF-'+program+'-'+String(a.date).slice(0,10)+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function cycleMenu() {
    const dlg=document.createElement('dialog');
    dlg.style.cssText='width:92%;max-width:440px;max-height:80vh;overflow:auto;border:0;border-radius:16px;padding:20px;background:#fff;color:#142337';
    document.body.append(dlg);dlg.addEventListener('close',()=>dlg.remove());
    const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;dlg.append(el);return el;};
    const button=(label,fn)=>{const b=text('button',label);b.type='button';b.className='button ghost';b.style.cssText='display:block;width:100%;margin:8px 0;padding:12px;white-space:normal';b.onclick=fn;};
    const list=archives();
    function home(){dlg.replaceChildren();text('h2','Gestion des cycles');text('p','Programme '+(isSplit?'2':'1')+' — Cycle en cours');button('Consulter les anciens cycles',()=>browse(false));button('Exporter un ancien cycle',()=>browse(true));button('Démarrer un nouveau cycle',()=>{dlg.close();newCycle();});button('Fermer',()=>dlg.close());}
    function browse(exportOnly){dlg.replaceChildren();text('h2',exportOnly?'Exporter un cycle':'Anciens cycles');if(!list.length)text('p','Aucun cycle archivé sur cet appareil.');for(const a of list)button('Cycle archivé le '+archiveDate(a),()=>exportOnly?exportArchive(a):detail(a));button('Retour',home);}
    function detail(a){dlg.replaceChildren();text('h2','Cycle du '+archiveDate(a));text('p','Lecture seule — aucune modification du cycle actuel.');const {series,other}=rowsFor(a);const days=isSplit?['Lundi','Mardi','Mercredi','Jeudi','Vendredi']:['Lundi','Mardi','Jeudi','Vendredi','Samedi'];if(!series.length)text('p','Aucune série enregistrée.');let last='';for(const r of series){const group=r.w+'_'+r.d+'_'+r.i;if(group!==last){text('h4','S'+r.w+' · '+days[r.d]+' · '+r.name);last=group;}text('p','Série '+(r.s+1)+' : '+(r.kg??'—')+' kg · '+(r.reps??'—')+' répétitions'+(r.done==='1'?' · Validée':''));}if(other.length){const details=text('details','');const summary=document.createElement('summary');summary.textContent='Autres résultats enregistrés';details.append(summary);for(const [k,v] of other){const line=document.createElement('p');line.textContent=k+' : '+v;line.style.overflowWrap='anywhere';details.append(line);}}button('Exporter ce cycle (CSV)',()=>exportArchive(a));button('Retour',()=>browse(false));button('Fermer',()=>dlg.close());}
    home();dlg.showModal();
  }

  function mountCycle() {
    const exp=document.getElementById(isSplit?'splitExport':'export');
    if (!exp || document.getElementById('jfNewCycle')) return;
    const b=document.createElement('button');
    b.id='jfNewCycle'; b.type='button'; b.className='button ghost';
    b.style.cssText='width:100%;margin-top:8px';
    b.textContent='Nouveau cycle';
    b.onclick=cycleMenu;
    exp.after(b);
  }
  mountCycle();
  new MutationObserver(mountCycle).observe(document.querySelector('main'),
    {childList:true,subtree:true});
  await sync();
  setInterval(sync,5000);
  window.addEventListener('online',sync);
  window.addEventListener('focus',sync);
})().catch(e=>console.error('JF Training backup',e));
