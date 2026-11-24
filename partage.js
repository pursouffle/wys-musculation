
/*
 * JF Training — Partage des accès
 * Version 1 : vérification et activation des invitations
 *
 * Ce fichier ne modifie aucune donnée d'entraînement.
 */

(function () {
  'use strict';

  const SUPABASE_URL =
    'https://nycwwzrtpswsngsghgiz.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_AMFCbul5u3fkOBEQSCN8-Q_3AHabftt';

  let clientPromise;

  async function getClient() {
    if (!clientPromise) {
      clientPromise = import(
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
      ).then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            storageKey: 'jf-cloud-auth'
          }
        })
      );
    }

    return clientPromise;
  }

  async function verifierAcces() {
    const db = await getClient();

    const { data: auth, error: authError } =
      await db.auth.getUser();

    if (authError || !auth.user) {
      return {
        autorise: false,
        raison: 'connexion_requise'
      };
    }

    const { data, error } = await db
      .from('jf_training_access')
      .select('role, enabled, expires_at')
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || !data.enabled) {
      return {
        autorise: false,
        raison: 'acces_inactif'
      };
    }

    if (
      data.expires_at &&
      new Date(data.expires_at).getTime() <= Date.now()
    ) {
      return {
        autorise: false,
        raison: 'acces_expire'
      };
    }

    return {
      autorise: true,
      role: data.role,
      expires_at: data.expires_at
    };
  }

  async function activerInvitation(code) {
    const db = await getClient();

    const { data, error } = await db.rpc(
      'jf_training_activate_invite',
      {
        p_code: String(code || '').trim()
      }
    );

    if (error) {
      throw error;
    }

    return data === true;
  }

  window.JFTrainingPartage = Object.freeze({
    version: '1.1',
    verifierAcces,
    activerInvitation
  });
})();
