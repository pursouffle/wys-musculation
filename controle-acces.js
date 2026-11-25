
(function () {
  'use strict';

  const PROGRAMMES = ['1', '2'];
  const SUPABASE_URL = 'https://nycwwzrtpswsngsghgiz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_AMFCbul5u3fkOBEQSCN8-Q_3AHabftt';

  const programme = document.documentElement.dataset.jfProgramme;

  // Empêche l'affichage du programme pendant la vérification.
  document.documentElement.style.visibility = 'hidden';

  function afficherEcran(message, lien, destination) {
    document.documentElement.style.visibility = 'visible';
    document.body.replaceChildren();

    const fond = document.createElement('main');
    fond.style.cssText =
      'min-height:100vh;display:flex;align-items:center;' +
      'justify-content:center;padding:20px;background:#f1f5f9;' +
      'font-family:system-ui,sans-serif;color:#142337';

    const carte = document.createElement('div');
    carte.style.cssText =
      'width:100%;max-width:390px;background:white;' +
      'padding:25px;border-radius:16px;text-align:center;' +
      'box-shadow:0 3px 15px #0001';

    const titre = document.createElement('h2');
    titre.textContent = '🐂 JF Training';

    const texte = document.createElement('p');
    texte.textContent = message;

    carte.append(titre, texte);

    if (lien && destination) {
      const bouton = document.createElement('a');
      bouton.href = destination;
      bouton.textContent = lien;
      bouton.style.cssText =
        'display:block;background:#173e61;color:white;' +
        'padding:12px;border-radius:10px;text-decoration:none;' +
        'margin-top:15px;font-weight:bold';
      carte.append(bouton);
    }

    fond.append(carte);
    document.body.append(fond);
  }

  async function verifierAcces() {
    try {
      if (!PROGRAMMES.includes(programme)) {
        afficherEcran('Programme non configuré.');
        return;
      }

      const { createClient } = await import(
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
      );

      const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          storageKey: 'jf-cloud-auth',
          persistSession: true,
          autoRefreshToken: true
        }
      });

      const { data: utilisateur, error: erreurUtilisateur } =
        await db.auth.getUser();

      if (erreurUtilisateur || !utilisateur.user) {
        afficherEcran(
          'Connecte-toi pour utiliser ton programme.',
          'Connexion / Activation',
          './invitation.html'
        );
        return;
      }

      const { data: autorise, error: erreurAcces } = await db.rpc(
        'jf_training_can_access',
        { p_programme: programme }
      );

      if (erreurAcces) throw erreurAcces;

      if (autorise !== true) {
        afficherEcran(
          'Tu ne disposes pas d’un accès valide à ce programme.',
          'Voir l’autre programme',
          programme === '1' ? './split.html' : './index.html'
        );
        return;
      }

      const { data: administrateur } = await db.rpc(
        'jf_training_is_admin'
      );

      document.documentElement.style.visibility = 'visible';

      if (administrateur === true) {
        const bouton = document.createElement('a');
        bouton.href = './gestion-acces.html';
        bouton.textContent = '🔐 Gestion des accès';
        bouton.style.cssText =
          'position:fixed;bottom:15px;left:15px;' +
          'background:#173e61;color:white;padding:12px 16px;' +
          'border-radius:12px;text-decoration:none;font-weight:bold;' +
          'z-index:9999;box-shadow:0 3px 12px #0003';
        document.body.append(bouton);
      }

    } catch (erreur) {
      console.error('Erreur de contrôle JF Training :', erreur);
      afficherEcran(
        'Impossible de vérifier ton accès. Vérifie ta connexion Internet.',
        'Réessayer',
        window.location.href
      );
    }
  }

  // Attend que la structure HTML soit entièrement disponible.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifierAcces, {
      once: true
    });
  } else {
    verifierAcces();
  }
})();
