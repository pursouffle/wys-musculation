(function () {

'use strict';


const PROGRAMMES = ['1', '2'];

const SUPABASE_URL = 'https://nycwwzrtpswsngsghgiz.supabase.co';

const SUPABASE_KEY = 'sb_publishable_AMFCbul5u3fkOBEQSCN8-Q_3AHabftt';

const programme = document.documentElement.dataset.jfProgramme;


document.documentElement.style.visibility = 'hidden';


function ecran(message, options = {}) {

document.documentElement.style.visibility = 'visible';

document.body.replaceChildren();

const fond = document.createElement('main');

fond.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#f1f5f9;font-family:system-ui,sans-serif;color:#142337';

const carte = document.createElement('div');

carte.style.cssText = 'width:100%;max-width:390px;background:white;padding:25px;border-radius:16px;text-align:center;box-shadow:0 3px 15px #0001';

const titre = document.createElement('h2');

titre.textContent = '🐂 JF Training';

const texte = document.createElement('p');

texte.textContent = message;

carte.append(titre, texte);

if (options.lien && options.destination) {

const bouton = document.createElement('a');

bouton.href = options.destination;

bouton.textContent = options.lien;

bouton.style.cssText = 'display:block;background:#173e61;color:white;padding:12px;border-radius:10px;text-decoration:none;margin-top:15px;font-weight:bold';

carte.append(bouton);

}

fond.append(carte);

document.body.append(fond);

return carte;

}


async function connexion(db) {

const carte = ecran('Connecte-toi avec l’adresse e-mail de ton compte JF Training. Si ton invitation a déjà été activée, tu n’as pas besoin d’un nouveau code.');

const form = document.createElement('form');

const email = document.createElement('input');

email.type = 'email';

email.required = true;

email.autocomplete = 'email';

email.placeholder = 'Ton adresse e-mail';

email.setAttribute('aria-label', 'Adresse e-mail');

email.style.cssText = 'width:100%;padding:12px;margin:10px 0;border:1px solid #ccd7e2;border-radius:9px;font:inherit';

const bouton = document.createElement('button');

bouton.type = 'submit';

bouton.textContent = 'Recevoir mon lien de connexion';

bouton.style.cssText = 'width:100%;background:#173e61;color:white;border:0;border-radius:9px;padding:13px;font:inherit;cursor:pointer';

const statut = document.createElement('p');

statut.setAttribute('role', 'status');

form.append(email, bouton, statut);

carte.append(form);

const aide = document.createElement('p');

aide.style.cssText = 'font-size:13px;color:#52667d';

aide.textContent = 'Première visite ? Utilise d’abord ton lien personnel d’invitation.';

carte.append(aide);


form.addEventListener('submit', async function (event) {

event.preventDefault();

bouton.disabled = true;

statut.textContent = 'Envoi en cours…';

try {

const retour = new URL(window.location.href);

retour.search = '';

retour.hash = '';

const { error } = await db.auth.signInWithOtp({

email: email.value.trim(),

options: { emailRedirectTo: retour.href }

});

if (error) throw error;

statut.textContent = 'Lien envoyé. Ouvre le mail sur ce même navigateur, puis reviens sur ton programme.';

statut.style.color = '#147c66';

} catch (erreur) {

console.error('Connexion JF Training :', erreur);

statut.textContent = 'Impossible d’envoyer le lien. Réessaie.';

statut.style.color = '#b42318';

bouton.disabled = false;

}

});

}


async function verifierAcces() {

try {

if (!PROGRAMMES.includes(programme)) {

ecran('Programme non configuré.');

return;

}

const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {

auth: {

storageKey: 'jf-cloud-auth',

persistSession: true,

autoRefreshToken: true,

detectSessionInUrl: true

}

});

const { data: utilisateur, error: erreurUtilisateur } = await db.auth.getUser();

if (erreurUtilisateur || !utilisateur.user) {

await connexion(db);

return;

}

const { data: autorise, error: erreurAcces } = await db.rpc('jf_training_can_access', { p_programme: programme });

if (erreurAcces) throw erreurAcces;

if (autorise !== true) {

ecran('Tu ne disposes pas d’un accès valide à ce programme.', {

lien: 'Voir l’autre programme',

destination: programme === '1' ? './split.html' : './index.html'

});

return;

}

const { data: administrateur } = await db.rpc('jf_training_is_admin');

document.documentElement.style.visibility = 'visible';

if (administrateur === true && !document.getElementById('jf-gestion-acces')) {

const bouton = document.createElement('a');

bouton.id = 'jf-gestion-acces';

bouton.href = './gestion-acces.html';

bouton.textContent = '🔐 Gestion des accès';

bouton.style.cssText = 'position:fixed;bottom:15px;left:15px;background:#173e61;color:white;padding:12px 16px;border-radius:12px;text-decoration:none;font-weight:bold;z-index:9999;box-shadow:0 3px 12px #0003';

document.body.append(bouton);

}

} catch (erreur) {

console.error('Erreur de contrôle JF Training :', erreur);

ecran('Impossible de vérifier ton accès. Vérifie ta connexion Internet.', {

lien: 'Réessayer', destination: window.location.href

});

}

}


if (document.readyState === 'loading') {

document.addEventListener('DOMContentLoaded', verifierAcces, { once: true });

} else {

verifierAcces();

}

})();
