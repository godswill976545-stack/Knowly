# MonCheck — alertes officielles du Bénin, en français simple

MonCheck envoie les alertes réglementaires du Bénin sur le téléphone, explique
chacune en français simple, et aide à suivre son budget en FCFA. Pensé pour les
téléphones Android d'entrée de gamme avec une connexion lente et coûteuse :
petit, léger, français d'abord, connexion par numéro de téléphone.

Stack : **Next.js (App Router) sur Vercel + Supabase** (Auth + Postgres + RLS).
Thème crème original conservé (#fbf5e6, vert kente #18803d).

## Lancer en local (mode démo)

Sans rien configurer, l'application tourne en **mode démo** : aucune vraie
connexion, données stockées dans le navigateur (localStorage), alertes de
démonstration incluses.

```bash
npm install
npm run dev        # http://localhost:3000
```

## Mise en place Supabase (production)

1. **Créer le projet** sur [supabase.com](https://supabase.com).
2. **Schéma** : ouvrir *SQL Editor* et exécuter
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   (profiles + trigger d'inscription, alerts, alert_explanations,
   budget_entries, question_logs, RLS sur toutes les tables).
3. **SMS (connexion par téléphone)** : Dashboard → Authentication → Providers
   → Phone, puis configurer **Twilio** (Account SID, Auth Token, Message
   Service SID). Les SMS partent de `signInWithOtp` côté client ; rien d'autre
   à coder.
4. **WhatsApp OTP (optionnel)** : configurer un *WhatsApp sender* dans Twilio,
   puis mettre `NEXT_PUBLIC_WHATSAPP_OTP_ENABLED=1` pour afficher
   « Recevoir par WhatsApp ».
5. **E-mail (connexion de secours)** : Authentication → Email Templates, garder
   `{{ .Token }}` dans le modèle (« Magic Link » par défaut) pour que le code à
   6 chiffres soit envoyé, pas seulement le lien.
6. **Variables d'environnement** (voir `.env.example`) :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (routes serveur : cache d'explications,
     journal des questions, publication admin)
   - `NEXT_PUBLIC_APP_URL` (ex. `https://moncheck.vercel.app`, pour les
     aperçus WhatsApp)
   - `GOOGLE_API_KEY` (optionnel : explications IA ; sans clé, un texte simple
     déjà stocké sur l'alerte est utilisé)
7. **Alertes de départ** : `npm run seed` (utilise `SUPABASE_URL` et
   `SUPABASE_SERVICE_ROLE_KEY`). Elles arrivent en `draft` ou `published` —
   **relisez et vérifiez chaque texte et chaque lien avant de publier**, ce
   sont des contenus d'exemple.
8. **Premier administrateur** : `update public.profiles set is_admin = true
   where phone = '+22901…';` — l'admin publie les brouillons sur `/admin`.

### Numéros de téléphone (plan à 10 chiffres du Bénin)

Depuis le 30/11/2024 (ARCEP), les numéros béninois sont à 10 chiffres : `01`
+ l'ancien numéro à 8 chiffres. L'application accepte `97 00 00 01`,
`01 97 00 00 01` ou `+229 01 97 00 00 01` et envoie toujours l'E.164
`+22901XXXXXXXX` attendu par Twilio. Les fixes (01 2x / 01 3x) sont refusés car
ils ne reçoivent pas de SMS. Notes Twilio : l'envoi vers le Bénin est
unidirectionnel (idéal pour un code OTP) et utilisez un **sender ID
alphanumérique** pré-enregistré pour les destinations MTN.

## Déploiement sur Vercel

1. Déployer ce dossier (monorepo : régler *Root Directory* sur `moncheck/` ou
   déployer ce dossier comme nouveau projet `moncheck`).
2. Renseigner les variables d'environnement ci-dessus dans Vercel.
3. Le framework Next.js est détecté automatiquement ; aucune config
   supplémentaire n'est requise.

## Fonctionnement

| Page | Rôle |
| --- | --- |
| `/connexion` | seul point d'entrée : code SMS à 6 chiffres (défaut) ou e-mail (secours). Pas de mot de passe, pas de page d'inscription. |
| `/accueil` | bonjour + reste du mois, 3 gros boutons (Alertes / Budget / Question), dernière alerte, navigation basse. |
| `/alertes` | liste filtrée (Tout, Impôts, Banque et Mobile Money, Travail, Commerce) ; détail avec « Explique-moi simplement » (générée une fois, mise en cache), lecture à voix haute, partage WhatsApp. |
| `/alerte/{id}` | page publique légère pour le partage WhatsApp (Open Graph propre), visible sans compte. |
| `/budget` | revenus / dépenses / reste du mois, ajout en 3 tapes, 11 catégories béninoises, totaux par catégorie ; les ajouts hors ligne sont synchronisés au retour de la connexion. |
| `/question` | réponses uniquement à partir des alertes officielles enregistrées, avec sources et limite par utilisateur (10/heure). |
| `/aide` | compte, déconnexion, installation, fonctionnement hors ligne. |
| `/admin` | relecture et publication des brouillons (administrateurs uniquement). |

- **Hors ligne** : le service worker met l'application en cache, les
  20 dernières alertes restent dans localStorage, bannière « Mode hors ligne ».
- **Langues** : tout le texte est dans `src/lib/translations/fr.json` ;
  `fon.json` et `yo.json` sont préparés (mêmes clés, vides) pour plus tard.
- **Argent** : entiers (XOF sans décimales), affichage « 25 000 FCFA ».

## Sécurité

- RLS activée sur toutes les tables ; chaque utilisateur ne voit que sa propre
  ligne (`profiles`, `budget_entries`). Les alertes publiées sont lisibles par
  tous ; les brouillons uniquement par les administrateurs.
- La clé de service reste côté serveur (`SUPABASE_SERVICE_ROLE_KEY`, jamais en
  `NEXT_PUBLIC_*`).
- `/api/ask` limite à 10 questions/heure/utilisateur et ne devine jamais sans
  source.
