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

await sync();

setInterval(sync,5000);

window.addEventListener('online',sync);

window.addEventListener('focus',sync);

})().catch(e=>console.error('JF Training backup',e));
