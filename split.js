/* JF Training - module Split, indépendant des données wys12_ */

(()=>{'use strict';

const DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];

const GROUPS=['Pectoraux + triceps','Quadriceps + mollets','Dos + biceps','Ischios + fessiers + abdos','Épaules + rappel pecs/dos'];

const SHORT=['Pecs / Triceps','Quadriceps / Mollets','Dos / Biceps','Ischios / Fessiers','Épaules / Pecs-Dos'];

const E=(name,sets,reps,rest=90,note='')=>({name,sets,reps,rest,note});

const PLAN=[

[E('Développé couché barre',3,'6–8',150),E('Développé incliné haltères 30°',3,'8–10',120),E('Dips lestés',3,'6–10',120,'Noter le lest ajouté en kg ; 0 si sans lest.'),E('Écartés à la poulie',3,'12–15',60),E('Chest press convergente',2,'10–12',90),E('Extension triceps au-dessus de la tête',3,'10–12',60),E('Extension triceps corde',3,'12–15',60)],

[E('Squat barre chargé',3,'6–10',180),E('Hack squat',4,'6–10',150),E('Presse à cuisses',3,'10–12',120),E('Leg extension',3,'12–15',60),E('Fentes bulgares',2,'10/jambe',90),E('Mollets debout',4,'8–12',60),E('Mollets assis',3,'12–15',60)],

[E('Tractions lestées',3,'6–10',150,'Noter le lest ajouté en kg ; 0 si au poids du corps.'),E('Rowing poitrine appuyée',3,'8–10',120),E('Tirage vertical prise neutre',3,'10–12',90),E('Rowing unilatéral poulie',2,'10–12',75),E('Curl incliné haltères',3,'10–12',60),E('Curl pupitre',3,'10–12',60),E('Curl marteau',2,'12–15',60)],

[E('Deadlift classique',3,'5–6',180,'Échauffement progressif, technique stricte, aucune répétition forcée.'),E('Hip thrust barre',3,'8–12',150),E('Leg curl assis',3,'10–12',90),E('Nordic curl assisté',2,'5–8',120,'Conserver le même niveau d’assistance pour comparer S1/S12.'),E('Leg curl allongé',2,'12–15',75),E('Abducteurs machine',3,'12–20',60),E('Crunch poulie haute',3,'12–15',60),E('Relevés de genoux suspendu',3,'10–15',60)],

[E('Développé épaules machine',3,'8–10',120),E('Élévations latérales poulie',4,'12–20',60),E('Oiseau machine',3,'12–15',60),E('Face pull',2,'15–20',60),E('Développé incliné machine',3,'10–12',90),E('Rowing machine',3,'10–12',90),E('Pompes classiques',2,'max propre',90,'S1 et S12 : noter le maximum de répétitions strictes sur une seule série.')]

];

const TESTS=[[[0,'Développé couché barre'],[2,'Dips lestés']],[[1,'Hack squat'],[0,'Squat barre chargé']],[[1,'Rowing poitrine appuyée'],[0,'Tractions lestées']],[[0,'Deadlift classique'],[1,'Hip thrust barre'],[3,'Nordic curl assisté']],[[0,'Développé épaules machine'],[6,'Pompes classiques']]];

const oldMain=document.querySelector('main');if(!oldMain)return;

const css=document.createElement('style');css.textContent=`

#jfSplit .days{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin:12px 0}

#jfSplit .days button{min-width:0;min-height:76px;border:1px solid #cbd6e2;border-radius:14px;background:#fff;color:#142337;padding:12px 4px;font:inherit;text-align:center;cursor:pointer;box-shadow:none}

#jfSplit .days button b{display:block;font-size:13px;margin-bottom:5px}

#jfSplit .days button span{display:block;font-size:11px;line-height:1.3;overflow-wrap:anywhere}

#jfSplit .days button.active{background:#173e61;color:#fff;border-color:#173e61}

@media(max-width:420px){#jfSplit .days{gap:5px}#jfSplit .days button{padding:10px 2px}#jfSplit .days button b{font-size:12px}#jfSplit .days button span{font-size:10px}}

[hidden]{display:none!important}`;document.head.append(css);

const key=(w,d,i,s,f)=>`jf_split_${w}_${d}_${i}_${s}_${f}`;

const read=k=>{try{return localStorage.getItem(k)||''}catch{return ''}};

const write=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}const status=document.getElementById('splitSaved');if(status)status.textContent='✓ Enregistré sur cet appareil'};

let program=read('jf_active_program')==='split'?'split':'original';let week=Math.min(12,Math.max(1,Number(read('jf_split_week'))||1)),day=Math.min(4,Math.max(0,Number(read('jf_split_day'))||0));

let timer=null,end=0,remain=0,timerBtn=null;

// Le programme Split possède sa propre page split.html.

// Aucun sélecteur de programme n'est nécessaire ici.

const originalNodes=[...oldMain.children];

const split=document.createElement('section');split.id='jfSplit';oldMain.append(split);

function setProgram(p){program=p;write('jf_active_program',p);originalNodes.forEach(x=>x.hidden=p==='split');split.hidden=p!=='split';const subtitle=document.querySelector('header div div');if(subtitle)subtitle.textContent=p==='split'?'Split prise de masse · 12 semaines · 5 jours':'Corps complet · 12 semaines · Haut / Bas';if(p==='split')render()}

const phase=w=>w<=4?'Progression · semaines 1 à 4':w===5?'Décharge · semaine 5':w<=9?'Progression · semaines 6 à 9':w<=11?'Consolidation · semaines 10 et 11':'Tests et bilan · semaine 12';

const sets=(ex,w)=>w===5?Math.min(2,ex.sets):w===12?Math.min(2,ex.sets):ex.sets;

function inputField(k,type='number',step='1'){const el=document.createElement('input');el.type=type;if(type==='number'){el.min='0';el.step=step}el.value=read(k);el.style.cssText='width:100%;min-width:0;padding:9px 4px;border:1px solid #cbd6e2;border-radius:8px;text-align:center;font-size:16px';el.addEventListener('input',()=>write(k,el.value));return el}

// Dernière série renseignée : chercher depuis la fin, sans changer les données.

function lastSeries(w,d,i){const ex=PLAN[d][i];for(let s=sets(ex,w)-1;s>=0;s--){const kg=read(key(w,d,i,s,'kg'));const reps=read(key(w,d,i,s,'reps'));if(kg!==''&&reps!=='')return {kg,reps,serie:s+1}}return null}

function progressionView(){const panel=document.createElement('div');panel.className='card';panel.innerHTML='<h2>📈 Progression · S1 / S12</h2><p class="small">Comparaison automatique de la dernière série avec charge et répétitions renseignées en semaine 1 et en semaine 12. Les données proviennent directement des séances, sans nouvelle saisie.</p>';

DAYS.forEach((name,d)=>{const heading=document.createElement('h3');heading.textContent=name+' · '+GROUPS[d];heading.style.marginTop='22px';panel.append(heading);PLAN[d].forEach((ex,i)=>{const a=lastSeries(1,d,i),b=lastSeries(12,d,i);const block=document.createElement('div');block.className='test';const title=document.createElement('strong');title.textContent=ex.name;block.append(title);const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px';[[1,a],[12,b]].forEach(([w,v])=>{const cell=document.createElement('div');cell.style.cssText='padding:9px;background:#f1f5f9;border-radius:9px';const h=document.createElement('div');h.className='small';h.textContent='Semaine '+w;cell.append(h);const val=document.createElement('strong');val.textContent=v?v.kg+' kg × '+v.reps+' reps':'En attente';cell.append(val);if(v){const sub=document.createElement('div');sub.className='small';sub.textContent='Série '+v.serie;cell.append(sub)}grid.append(cell)});block.append(grid);if(a&&b){const diffKg=Number(b.kg)-Number(a.kg),diffRep=Number(b.reps)-Number(a.reps);const delta=document.createElement('p');delta.className='small';delta.style.marginBottom='0';delta.textContent='Évolution : '+(diffKg>=0?'+':'')+diffKg.toLocaleString('fr-FR')+' kg · '+(diffRep>=0?'+':'')+diffRep+' reps';block.append(delta)}panel.append(block)})});return panel}

let activeTab='seances';

function stopTimer(){if(timer)clearInterval(timer);timer=null;end=0;remain=0;if(timerBtn){timerBtn.textContent='⏱ Repos '+timerBtn.dataset.rest+' s';timerBtn=null}const clock=document.getElementById('splitClock');if(clock)clock.textContent='00:00'}

function tick(){if(end)remain=Math.max(0,Math.ceil((end-Date.now())/1000));const clock=document.getElementById('splitClock');const value=`${String(Math.floor(remain/60)).padStart(2,'0')}:${String(remain%60).padStart(2,'0')}`;if(clock)clock.textContent=value;if(timerBtn&&end)timerBtn.textContent='⏸ '+value;if(end&&remain===0){const btn=timerBtn;stopTimer();if(btn)btn.textContent='✓ Repos terminé';try{navigator.vibrate?.([250,150,250,150,250])}catch{}}}

function startTimer(s,btn){stopTimer();timerBtn=btn;btn.dataset.rest=s;remain=s;end=Date.now()+s*1000;tick();timer=setInterval(tick,250)}

function toggleTimer(s,btn){if(timerBtn!==btn){startTimer(s,btn);return}if(end){remain=Math.max(0,Math.ceil((end-Date.now())/1000));clearInterval(timer);timer=null;end=0;btn.textContent='▶ Reprendre '+remain+' s'}else{end=Date.now()+remain*1000;timer=setInterval(tick,250);tick()}}


function explanationBox(){

const wrap=document.createElement('details');

wrap.className='jf-rir-help';

wrap.style.cssText='flex:1 1 auto;min-width:0';

const summary=document.createElement('summary');

summary.textContent='📖 Aide RIR et entraînement';

summary.style.cssText='cursor:pointer;font-size:13px;font-weight:700;padding:10px 8px;background:#edf3f9;color:#173e61;border-radius:9px;text-align:center;list-style:none';

wrap.append(summary);

const content=document.createElement('div');

content.style.cssText='line-height:1.65;margin-top:14px;padding:12px;background:#f8fafc;border:1px solid #dbe4ee;border-radius:10px';

content.innerHTML=`

<h3>1. RIR – Répétitions en réserve</h3>

<p>Le RIR est le nombre de répétitions que tu pourrais encore faire avant l’échec musculaire, avec une bonne technique.</p>

<p><b>RIR 4</b> : encore 4 répétitions ; <b>RIR 3</b> : encore 3 ; <b>RIR 2</b> : encore 2 ; <b>RIR 1</b> : encore 1 ; <b>RIR 0</b> : échec musculaire.</p>

<p><b>Exemple :</b> tu fais 10 répétitions au développé couché et tu aurais pu en faire 12 : tu es à RIR 2.</p>

<h3>2. Tempo – Vitesse d’exécution</h3>

<p><b>2-0-1-0</b> : 2 secondes pour descendre, aucune pause en bas, 1 seconde pour remonter, aucune pause en haut.</p>

<h3>3. Progression des charges</h3>

<p>Augmente d’abord les répétitions. Quand toutes les séries atteignent le haut de la fourchette avec la bonne technique et le RIR prévu, augmente légèrement la charge.</p>

<h3>4. Semaine 5 – Décharge</h3>

<p>Réduis le volume à 2 séries par exercice, diminue la charge d’environ 10 % et garde un RIR 4 pour favoriser la récupération.</p>

<h3>5. Semaine 12 – Bilan</h3>

<p>Compare les charges et répétitions des dernières séries renseignées en S1 et S12 avec le bouton 📈 Progression. Évite les répétitions forcées et conserve une technique identique.</p>

`;

wrap.append(content);

return wrap;

}


function render(){

stopTimer();

split.replaceChildren();

if(week!==12)activeTab='seances';


// Le sélecteur de semaine reste toujours visible, même dans Progression.

const top=document.createElement('div');

top.className='card';

top.innerHTML='<div class="controls" id="splitWeekControls"><label for="splitWeek"><b>Semaine</b></label><select id="splitWeek"></select></div><p id="splitPhase" class="small"></p><div id="splitProgress" style="font-size:13px;font-weight:650;margin:9px 0"></div><div class="progress"><div id="splitBar"></div></div>';

split.append(top);

const weekControls=top.querySelector('#splitWeekControls');

weekControls.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap';

const weekSelect=weekControls.querySelector('select');

weekSelect.style.cssText='flex:0 1 120px;min-width:100px;padding:10px 4px';

const help=explanationBox();

weekControls.append(help);

help.addEventListener('toggle',()=>{

if(help.open){

help.style.flexBasis='100%';

weekControls.append(help);

}else{help.style.flexBasis='auto'}

});

const sel=top.querySelector('select');

for(let i=1;i<=12;i++){

const opt=document.createElement('option');

opt.value=i;

opt.textContent='Semaine '+i;

sel.append(opt);

}

sel.value=week;

sel.onchange=()=>{

week=Number(sel.value);

write('jf_split_week',week);

activeTab='seances';

render();

};

top.querySelector('#splitPhase').textContent=phase(week);


// Un seul bouton en S12 : progression / retour aux exercices.

if(week===12){

const actions=document.createElement('div');

actions.className='card';

const btn=document.createElement('button');

btn.type='button';

btn.className='button';

btn.style.cssText='display:block;width:100%;padding:14px';

btn.textContent=activeTab==='progression'?'← Retour aux exercices':'📈 Progression';

btn.onclick=()=>{activeTab=activeTab==='progression'?'seances':'progression';render()};

actions.append(btn);

split.append(actions);

if(activeTab==='progression'){

split.append(progressionView());

return;

}

}

const nav=document.createElement('div');nav.className='days';DAYS.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.className=i===day?'active':'';b.innerHTML='<b>'+name+'</b><span>'+SHORT[i]+'</span>';b.setAttribute('aria-pressed',String(i===day));b.onclick=()=>{day=i;write('jf_split_day',i);render()};nav.append(b)});split.append(nav);

const card=document.createElement('div');card.className='card';card.innerHTML=`<div class="timer"><div><h2>${DAYS[day]} · ${GROUPS[day]}</h2><div class="small">${week===5?'RIR 4 · charges réduites':week===12?'Tests S12 · sans répétitions forcées':week<=4?'RIR 3 → 1 selon progression':'RIR 2 → 1 selon progression'}</div></div><strong id="splitClock" style="font-size:25px">00:00</strong></div><p class="small">${week===12?'Teste les mouvements ci-dessous, puis effectue le reste avec un volume réduit.':'Saisis les kg et répétitions après chaque série.'}</p>`;split.append(card);


PLAN[day].forEach((ex,i)=>{const c=document.createElement('div');c.className='exercise';const title=document.createElement('h3');title.textContent=(i+1)+' · '+ex.name;c.append(title);const meta=document.createElement('div');meta.className='small';meta.textContent=`${sets(ex,week)} séries · ${ex.reps} reps · repos ${ex.rest} s`;c.append(meta);if(ex.note||week===5){const note=document.createElement('div');note.className='note';note.textContent=(week===5?'S5 : volume réduit, environ −10 % de charge, RIR 4. ':'')+ex.note;c.append(note)}

if(week>1){const prior=[];for(let s=0;s<sets(ex,week-1);s++){const kg=read(key(week-1,day,i,s,'kg')),rep=read(key(week-1,day,i,s,'reps'));if(kg||rep)prior.push(`Série ${s+1} : ${kg||'—'} kg × ${rep||'—'} reps`)}if(prior.length){const prev=document.createElement('div');prev.className='previous';prev.textContent='📋 Semaine '+(week-1)+' : '+prior.join(' · ');c.append(prev)}}

const header=document.createElement('div');header.className='row small';header.innerHTML='<span>№</span><span style="text-align:center">kg</span><span style="text-align:center">reps</span><span>✓</span>';c.append(header);

for(let s=0;s<sets(ex,week);s++){const row=document.createElement('div');row.className='row';const num=document.createElement('span');num.textContent=s+1;row.append(num,inputField(key(week,day,i,s,'kg'),'number','0.5'),inputField(key(week,day,i,s,'reps')));const check=document.createElement('input');check.type='checkbox';check.checked=read(key(week,day,i,s,'done'))==='1';check.style.cssText='width:23px;height:23px;accent-color:#147c66';check.onchange=()=>{write(key(week,day,i,s,'done'),check.checked?'1':'0');progress();if(check.checked)startTimer(ex.rest,c.querySelector('.rest-action'))};row.append(check);c.append(row)}

const b=document.createElement('button');b.className='button ghost rest-action';b.style.marginTop='6px';b.dataset.rest=ex.rest;b.textContent='⏱ Repos '+ex.rest+' s';b.onclick=()=>toggleTimer(ex.rest,b);c.append(b);const reset=document.createElement('button');reset.className='button ghost';reset.style.cssText='margin:6px 0 0 6px';reset.textContent='↻';reset.onclick=()=>{stopTimer();b.textContent='⏱ Repos '+ex.rest+' s'};c.append(reset);const video=document.createElement('a');video.className='button ghost';video.style.cssText='display:inline-block;margin:6px 0 0 8px;text-decoration:none';video.textContent='🎥 Vidéo';video.href='https://www.youtube.com/results?search_query='+encodeURIComponent(ex.name+' technique musculation');video.target='_blank';video.rel='noopener noreferrer';c.append(video);card.append(c)});

const exportCard=document.createElement('div');exportCard.className='card';exportCard.innerHTML='<button class="button" id="splitExport" style="width:100%">⬇ Exporter le suivi Split (CSV)</button><p class="small">Données conservées dans le navigateur de cet appareil. Exporter régulièrement pour les sauvegarder.</p><span id="splitSaved" class="small"></span>';split.append(exportCard);exportCard.querySelector('button').onclick=exportCSV;progress()}

function progress(){let total=0,done=0;PLAN[day].forEach((ex,i)=>{for(let s=0;s<sets(ex,week);s++){total++;if(read(key(week,day,i,s,'done'))==='1')done++}});const el=document.getElementById('splitProgress'),bar=document.getElementById('splitBar');if(el)el.textContent=`${done} / ${total} séries terminées`;if(bar)bar.style.width=(total?100*done/total:0)+'%'}

function exportCSV(){const rows=[['Semaine','Jour','Exercice','Série','Charge kg','Reps','Terminée']];for(let w=1;w<=12;w++)for(let d=0;d<5;d++)PLAN[d].forEach((ex,i)=>{for(let s=0;s<sets(ex,w);s++){const kg=read(key(w,d,i,s,'kg')),reps=read(key(w,d,i,s,'reps')),done=read(key(w,d,i,s,'done'));if(kg||reps||done==='1')rows.push([w,DAYS[d],ex.name,s+1,kg,reps,done==='1'?'Oui':'Non'])}});rows.push([]);rows.push(['TESTS','Semaine','Jour','Exercice','Charge/lest kg','Reps','Assistance']);for(let w of [1,12])for(let d=0;d<5;d++)for(const [,name]of TESTS[d]){const i=PLAN[d].findIndex(x=>x.name===name);rows.push(['Test',w,DAYS[d],name,read(`jf_split_test_${w}_${d}_${i}_kg`),read(`jf_split_test_${w}_${d}_${i}_reps`),read(`jf_split_test_${w}_${d}_${i}_assist`)])}const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='JF_Training_Split_12_semaines.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}

document.addEventListener('visibilitychange',()=>{if(!document.hidden&&end)tick()});setProgram('split');

})();
