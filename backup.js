(async function () {

'use strict';

const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

const db = createClient('https://nycwwzrtpswsngsghgiz.supabase.co', 'sb_publishable_AMFCbul5u3fkOBEQSCN8-Q_3AHabftt', { auth: { storageKey: 'jf-cloud-auth' } });

const relevant = k => /^(wys12_|jf_split_|jf_cycle_)/.test(k) || ['wys_week', 'wys_day', 'jf_active_program'].includes(k);

const snapshot = () => Object.fromEntries(Object.keys(localStorage).filter(relevant).sort().map(k => [k, localStorage.getItem(k)]));

const equal = (a,b) => JSON.stringify(Object.entries(a || {}).sort()) === JSON.stringify(Object.entries(b || {}).sort());

const store = (data) => {

const before = snapshot();

for (const k of Object.keys(before)) if (!(k in data)) localStorage.removeItem(k);

for (const [k,v] of Object.entries(data)) localStorage.setItem(k,v);

};

let busy = false, blocked = false, userId = null, lastUserId = null, warned = false;

const warn = message => { if (!warned) { warned = true; alert(message); } };

const readJSON = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

const isSplit = location.pathname.endsWith('/split.html');

const program = isSplit ? 'split' : 'haut_bas';

const belongs = k => isSplit ? k.startsWith('jf_split_') : k.startsWith('wys12_') || ['wys_week','wys_day'].includes(k);



// Each user gets a private local copy. Never automatically assign old browser data

// to a new user: it may belong to the administrator or a previous member.

async function activateAccount(user) {

if (userId === user.id) return true;

const uid = user.id;

const marker = 'jf_local_owner_v2';

const owner = localStorage.getItem(marker);

const old = snapshot();

if (owner === uid && localStorage.getItem('jf_restored_v3_'+uid) === '1') {

userId = uid;

return true;

}

if (owner && owner !== uid) {

const previousKey = 'jf_local_private_v2_' + owner;

localStorage.setItem(previousKey, JSON.stringify(old));

} else if (!owner && Object.keys(old).length) {

// Preserve legacy data without attributing it to the new account.

if (!localStorage.getItem('jf_legacy_recovery_v2'))

localStorage.setItem('jf_legacy_recovery_v2', JSON.stringify(old));

}

const privateKey = 'jf_local_private_v2_' + uid;

const initial = readJSON(privateKey) || {};

const {data: row, error} = await db.from('jf_training_backup')

.select('data').eq('user_id',uid).maybeSingle();

if (error) throw error;

const remote = row?.data || {};

if (Object.entries(remote).some(([k,v]) => !relevant(k) || typeof v !== 'string'))

throw Error('Sauvegarde distante invalide');

const recovery = 'jf_restore_recovery_v3_' + uid;

if (!localStorage.getItem(recovery))

localStorage.setItem(recovery, JSON.stringify({local:old,private:initial}));

store(remote);

localStorage.setItem(marker,uid);

localStorage.setItem(privateKey,JSON.stringify(remote));

localStorage.setItem('jf_cloud_base_'+uid,JSON.stringify(remote));

localStorage.setItem('jf_restored_v3_'+uid,'1');

location.reload();

return false;

}



async function sync() {

if (busy || blocked || !navigator.onLine) return;

busy = true;

try {

const { data: auth, error: authError } = await db.auth.getUser();

if (authError || !auth.user) return;

const user = auth.user;

if (!userId || userId !== user.id || localStorage.getItem('jf_local_owner_v2') !== user.id) {

await activateAccount(user);

return;

}

const uid = user.id;

const local = snapshot();

const privateKey = 'jf_local_private_v2_' + uid;

const previous = readJSON(privateKey) || {};

const { data: r, error } = await db.from('jf_training_backup')

.select('data,updated_at').eq('user_id',uid).maybeSingle();

if (error) throw error;

const remote = r?.data || {};

if (Object.entries(remote).some(([k,v]) => !relevant(k) || typeof v !== 'string'))

throw Error('Format distant invalide');

// Three-way merge with the last synchronized state; never guess on conflict.

const baseKey = 'jf_cloud_base_' + uid;

const base = readJSON(baseKey);

const merged = {};

const keys = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base || {})]);

for (const k of keys) {

const l = local[k], d = remote[k], b = base?.[k];

let v;

if (l === d) v = l;

else if (!base) {

if (l === undefined) v = d;

else if (d === undefined) v = l;

else if (['wys_week','wys_day','jf_active_program','jf_split_week','jf_split_day'].includes(k)) v = d;

else { blocked = true; break; }

} else if (l === b) v = d;

else if (d === b) v = l;

else { blocked = true; break; }

if (v !== undefined) merged[k] = v;

}

if (blocked) {

warn('Deux versions différentes existent. Rien ne sera écrasé. Contacte ton assistance.');

return;

}

if (!equal(local, snapshot())) return;

if (!equal(merged, remote)) {

const row = { user_id: uid, data: merged, updated_at: new Date().toISOString() };

const result = r

? await db.from('jf_training_backup').update(row).eq('user_id',uid).eq('updated_at',r.updated_at).select('updated_at').single()

: await db.from('jf_training_backup').insert(row).select('updated_at').single();

if (result.error) throw result.error;

}

if (!equal(local, snapshot())) return;

if (!equal(local, merged)) {

localStorage.setItem('jf_cloud_previous_local_' + uid, JSON.stringify(local));

store(merged);

localStorage.setItem(privateKey, JSON.stringify(merged));

localStorage.setItem(baseKey, JSON.stringify(merged));

location.reload();

return;

}

localStorage.setItem(privateKey, JSON.stringify(merged));

localStorage.setItem(baseKey, JSON.stringify(merged));

warned = false;

} catch (err) { console.error('JF Training sauvegarde', err); }

finally { busy = false; }

}



async function newCycle() {

if (busy || blocked || !navigator.onLine) {

alert('Sauvegarde indisponible. Réessaie dans un instant.'); return;

}

if (!confirm('Archiver ce cycle et repartir en semaine 1 ?')) return;

busy = true;

const cover = document.createElement('dialog');

cover.textContent = 'Archivage et vérification en cours...';

cover.addEventListener('cancel', e => e.preventDefault());

document.body.append(cover); cover.showModal();

try {

const { data: auth, error: ae } = await db.auth.getUser();

if (ae || !auth.user || auth.user.id !== userId) throw Error('Connexion requise');

const uid = auth.user.id, baseKey = 'jf_cloud_base_' + uid;

const local = snapshot();

const { data: r, error: re } = await db.from('jf_training_backup')

.select('data,updated_at').eq('user_id',uid).single();

if (re) throw re;

if (!equal(local,r.data)) throw Error('Attends la synchronisation puis réessaie.');

const archive = Object.fromEntries(Object.entries(local).filter(([k]) => belongs(k)));

const id = 'jf_cycle_' + program + '_' + crypto.randomUUID();

const next = { ...local };

next[id] = JSON.stringify({ date: new Date().toISOString(), data: archive });

localStorage.setItem('jf_cloud_cycle_recovery_' + uid, JSON.stringify(local));

for (const k of Object.keys(archive)) delete next[k];

next[isSplit ? 'jf_split_week' : 'wys_week'] = '1';

next[isSplit ? 'jf_split_day' : 'wys_day'] = '0';

if (!equal(local,snapshot())) throw Error('Données modifiées. Réessaie.');

const { data: saved, error: se } = await db.from('jf_training_backup')

.update({ data: next, updated_at: new Date().toISOString() })

.eq('user_id',uid).eq('updated_at',r.updated_at).select('data').single();

if (se || !equal(saved?.data,next)) throw Error('Archivage non confirmé');

if (!equal(local,snapshot())) { blocked = true; throw Error('Données locales modifiées. Ne rien effacer.'); }

store(next);

localStorage.setItem('jf_local_private_v2_' + uid,JSON.stringify(next));

localStorage.setItem(baseKey,JSON.stringify(next));

location.reload();

} catch (e) { alert('Cycle non terminé : ' + e.message); }

finally { cover.close(); cover.remove(); busy = false; }

}



const splitNames = [["Développé couché barre", "Développé incliné haltères 30°", "Dips lestés", "Écartés à la poulie", "Chest press convergente", "Extension triceps au-dessus de la tête", "Extension triceps corde"], ["Squat barre chargé", "Hack squat", "Presse à cuisses", "Leg extension", "Fentes bulgares", "Mollets debout", "Mollets assis"], ["Tractions lestées", "Rowing poitrine appuyée", "Tirage vertical prise neutre", "Rowing unilatéral poulie", "Curl incliné haltères", "Curl pupitre", "Curl marteau"], ["Deadlift classique", "Hip thrust barre", "Leg curl assis", "Nordic curl assisté", "Leg curl allongé", "Abducteurs machine", "Crunch poulie haute", "Relevés de genoux suspendu"], ["Développé épaules machine", "Élévations latérales poulie", "Oiseau machine", "Face pull", "Développé incliné machine", "Rowing machine", "Pompes classiques"]];

function archives() {

return Object.entries(snapshot()).filter(([k]) => k.startsWith('jf_cycle_' + program + '_'))

.flatMap(([id,v]) => { try { const a=JSON.parse(v); return a.data && typeof a.data==='object' ? [{...a,id}] : []; } catch { return []; } })

.sort((a,b) => String(b.date).localeCompare(String(a.date)));

}

function rowsFor(a) {

const rows=new Map(), other=[];

for (const [key,value] of Object.entries(a.data)) {

const m=key.match(/^(?:wys12_|jf_split_)(\d+)_(\d+)_(\d+)_(\d+)_(kg|reps|done)$/);

if (!m) { if (!['wys_week','wys_day','jf_split_week','jf_split_day'].includes(key)) other.push([key,value]); continue; }

const [,w,d,i,s,f]=m, id=[w,d,i,s].join('_');

if (!rows.has(id)) {

let name='Exercice '+(Number(i)+1);

try { name=(isSplit ? splitNames[Number(d)]?.[Number(i)] : getExercises(Number(w),Number(d))[Number(i)]?.name) || name; } catch {}

rows.set(id,{w:+w,d:+d,i:+i,s:+s,name});

}

rows.get(id)[f]=value;

}

return {series:[...rows.values()].sort((a,b)=>a.w-b.w||a.d-b.d||a.i-b.i||a.s-b.s),other};

}

function exportArchive(a) {

const {series,other}=rowsFor(a);

const days=isSplit ? ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'] : ['Lundi','Mardi','Jeudi','Vendredi','Samedi'];

const rows=[['Semaine','Jour','Exercice','Série','Charge kg','Répétitions','Terminée','Autre donnée','Valeur'],...series.map(r=>[r.w,days[r.d],r.name,r.s+1,r.kg??'',r.reps??'',r.done==='1'?'Oui':'Non','','']),...other.map(([k,v])=>['','','','','','','',k,v])];

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

function home(){dlg.replaceChildren();text('h2','Gestion des cycles');text('p','Programme '+(isSplit?'2':'1')+' — Cycle en cours');button('Ouvrir les anciens cycles',browse);button('Démarrer un nouveau cycle',()=>{dlg.close();newCycle();});button('Fermer',()=>dlg.close());}

function browse(){dlg.replaceChildren();text('h2','Anciens cycles');if(!list.length)text('p','Aucun cycle archivé sur cet appareil.');for(const a of list)button('Cycle archivé le '+new Date(a.date).toLocaleString('fr-FR'),()=>detail(a));button('Retour',home);}

function detail(a){dlg.replaceChildren();text('h2','Cycle du '+new Date(a.date).toLocaleString('fr-FR'));text('p','Lecture seule — aucune modification du cycle actuel.');const {series,other}=rowsFor(a);const days=isSplit?['Lundi','Mardi','Mercredi','Jeudi','Vendredi']:['Lundi','Mardi','Jeudi','Vendredi','Samedi'];if(!series.length)text('p','Aucune série enregistrée.');let last='';for(const r of series){const group=r.w+'_'+r.d+'_'+r.i;if(group!==last){text('h4','S'+r.w+' · '+days[r.d]+' · '+r.name);last=group;}text('p','Série '+(r.s+1)+' : '+(r.kg??'—')+' kg · '+(r.reps??'—')+' répétitions'+(r.done==='1'?' · Validée':''));}if(other.length){const details=text('details','');const summary=document.createElement('summary');summary.textContent='Autres résultats enregistrés';details.append(summary);for(const [k,v] of other){const line=document.createElement('p');line.textContent=k+' : '+v;line.style.overflowWrap='anywhere';details.append(line);}}button('Exporter ce cycle (CSV)',()=>exportArchive(a));button('Retour',browse);button('Fermer',()=>dlg.close());}

home();dlg.showModal();

}

function mountCycle() {

const exp=document.getElementById(isSplit?'splitExport':'export');

if (!exp) return;

exp.style.display='none';

if (document.getElementById('jfNewCycle')) return;

const b=document.createElement('button');b.id='jfNewCycle';b.type='button';b.className='button ghost';b.style.cssText='width:100%;margin-top:8px';b.textContent='Nouveau cycle';b.onclick=cycleMenu;exp.after(b);

}



const { data: auth, error } = await db.auth.getUser();

if (error || !auth.user) return; // Login is handled by controle-acces.js.

if (!(await activateAccount(auth.user))) return;

const account = document.createElement('div');

account.style.cssText='padding:6px 12px;text-align:right;font-size:12px';

account.setAttribute('aria-label','Gestion du compte');

// Adresse e-mail non affichee.

const change = document.createElement('button');

change.textContent = 'Déconnexion';

change.style.cssText='background:transparent;border:0;color:inherit;font-size:12px;text-decoration:underline;cursor:pointer;padding:4px';

change.onclick = async () => {

if (busy || blocked) { alert('Sauvegarde en cours ou bloquée.'); return; }

if (!confirm('Changer de compte ?')) return;

await sync();

if (blocked) return;

busy = true;

const {error} = await db.auth.signOut({scope:'local'});

if (error) { busy=false; alert('Déconnexion impossible'); return; }

location.reload();

};

account.append(change);

document.body.append(account);

mountCycle();

const main=document.querySelector('main');

if (main) new MutationObserver(mountCycle).observe(main,{childList:true,subtree:true});

await sync();

setInterval(sync,5000);

window.addEventListener('online',sync);

window.addEventListener('focus',sync);

})().catch(e=>console.error('JF Training backup',e));
