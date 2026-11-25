
(async function () {
  'use strict';

  const programme = document.documentElement.dataset.jfProgramme;

  if (!['1', '2'].includes(programme)) {
    document.body.replaceChildren();
    document.body.textContent = 'Configuration du programme manquante.';
    return;
  }

  const ecran = document.createElement('div');
  ecran.id = 'jf-controle-acces';
  ecran.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;' +
    'background:#f1f5f9;color:#142337;' +
    'font-family:system-ui,sans-serif;' +
    'display:flex;align-items:center;justify-content:center;' +
    'padding:20px;text-align:center';

  const contenu = document.createElement('div');
  contenu.style.cssText =
    'max-width:380px;background:white;padding:25px;' +
    'border-radius:16px;width:100%';

  const titre = document.createElement('h2');
  titre.textContent = '🐂 JF Training';

  const message = document.createElement('p');
  message.textContent = 'Vérification de ton accès…';

  contenu.append(titre, message);
  ecran.append(contenu);
  document.body.append(ecran);

  try {
    const { createClient } = await import(
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
    );

    const db = createClient(
      'https://nycwwzrtpswsngsghgiz.supabase.co',
      'sb_publishable_AMFCbul5u3fkOBEQSCN8-Q_3AHabftt',
      { auth: { storageKey: 'jf-cloud-auth' } }
    );

    const { data: auth, error: authError } = await db.auth.getUser();

    if (authError || !auth.user) {
      message.textContent =
        'Connecte-toi pour accéder à ton programme.';

      const lien = document.createElement('a');
      lien.href = './invitation.html';
      lien.textContent = 'Connexion / Activation';
      lien.style.cssText =
        'display:block;background:#173e61;color:white;' +
        'padding:12px;border-radius:9px;text-decoration:none';

      contenu.append(lien);
      return;
    }

    const { data: autorise, error } = await db.rpc(
      'jf_training_can_access',
      { p_programme: programme }
    );

    if (error) throw error;

    if (autorise !== true) {
      message.textContent =
        'Tu ne disposes pas d’un accès valide à ce programme.';

      const retour = document.createElement('a');
      retour.href = programme === '1'
        ? './split.html'
        : './index.html';
      retour.textContent = 'Voir l’autre programme';
      retour.style.cssText =
        'display:block;margin-top:12px;color:#173e61';

      contenu.append(retour);
      return;
    }

    const { data: admin, error: adminError } = await db.rpc(
      'jf_training_is_admin'
    );

    if (!adminError && admin === true) {
      const lien = document.createElement('a');
      lien.href = './gestion-acces.html';
      lien.textContent = '🔐 Gestion des accès';
      lien.style.cssText =
        'position:fixed;bottom:15px;left:15px;' +
        'background:#173e61;color:white;padding:12px;' +
        'border-radius:12px;text-decoration:none;' +
        'font-weight:bold;z-index:9999;' +
        'box-shadow:0 3px 12px #0003';
      document.body.append(lien);
    }

    ecran.remove();

  } catch (erreur) {
    console.error('JF Training accès :', erreur);
    message.textContent =
      'Impossible de vérifier ton accès. Vérifie ta connexion et réessaie.';
  }
})();
