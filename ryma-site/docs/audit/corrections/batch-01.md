# Corrections du dashboard — lot 1

> Suivi : voir le [ré-audit complet des corrections](../reaudit/dashboard-reaudit.md). Ce document conserve les résultats du premier lot uniquement.


**7 octobre 2026 — corrections locales partielles. Les 19 constats de l'audit ne sont pas tous corrigés. Le verdict NON PRÊT reste applicable.**

Ce suivi complète le [rapport initial](../dashboard-audit.md), dont les preuves décrivent l'état avant correction. Aucun déploiement ni migration de la base réelle n'a été effectué.

## État des constats

| Constat | Changement livré | Statut et limites |
|---|---|---|
| QA-01 — suppression du RDV et perte clinique | DELETE archive le rendez-vous avec date, statut antérieur et événement d'audit dans une transaction. La séance et les documents sont conservés. L'agenda, les compteurs et la disponibilité excluent les archives ; le dossier peut les consulter. | Correctif API testé. La restauration d'une sauvegarde conserve l'archive et la séance. Aucun écran de désarchivage. Les suppressions directes de séance et de dossier patient restent hors de ce lot. |
| QA-02 — historique masqué après changement de téléphone | Le dossier et ses listes RDV/factures/prescriptions utilisent patientId. Le changement de contact, le rattachement des lignes anciennes sans patientId et la mise à jour de la fiche de notes sont atomiques. Les snapshots des documents émis restent inchangés. | Correctif testé via handlers et HTTP. Vérification navigateur du dossier corrigé non terminée. Aucun rapprochement global des données historiques ambiguës. |
| QA-03 — fusion silencieuse de personnes | La création avec un téléphone déjà attribué retourne 409 sans modifier la fiche. Une mise à jour exige l'ID existant. La conversion d'une ancienne fiche de notes exige legacyPhone explicite. | Risque de remplacement silencieux réduit. Le modèle reste à un téléphone unique par patient : il ne permet pas encore deux personnes avec le même numéro. L'identification téléphonique du parcours public reste à revoir. |
| QA-04 à QA-19 | Aucun correctif de ce lot. | **16 constats restent ouverts**, dont cinq P1 : suivi clinique futur/annulé, doubles factures, identité des documents, sauvegarde clinique partielle et précision monétaire. |

Précision sur QA-01 : l'action d'annulation existante dans le dashboard utilise déjà PATCH avec le statut CANCELLED. Le changement de ce lot porte sur l'API DELETE, qui supprimait physiquement les données. Il n'ajoute pas de nouveau bouton d'archivage.

## Vérifications

| Vérification | Résultat | Preuve |
|---|---|---|
| Suite SQLite, nouveaux tests inclus | 133 tests PASS, 0 FAIL | [suite.log](suite.log) |
| Suite libSQL en fichier, nouveaux tests inclus | 104 tests PASS, 0 FAIL | [libsql.log](libsql.log) |
| Régression dashboard | 36 contrôles PASS | [dashboard.log](dashboard.log) |
| Tests ciblés intégrité patient | 9 tests déclarés PASS par adaptateur ; inclus dans les suites ci-dessus | [SQLite](focused.log), [libSQL](focused-libsql.log) |
| HTTP sur serveur de développement isolé | 5 observations PASS : conflit de création, trois historiques après changement de contact, archivage avec conservation clinique | [http-results.json](http-results.json) |
| TypeScript sans émission | PASS | [typecheck.log](typecheck.log) |
| Build de production après correction | **BLOQUÉ** par téléchargement Google Fonts refusé dans le sandbox (EACCES) | [build.log](build.log) |
| Navigateur après correction | **NON TERMINÉ** : connexion et chargement initial effectués ; la reprise du contrôle a été refusée par la politique du navigateur. Pas de preuve visuelle du dossier corrigé. | Aucun résultat navigateur complet revendiqué |
| Données du projet réel | 16 fichiers existants hachés, aucun changement depuis le début des corrections | [preservation.json](preservation.json) |

Les suites se recouvrent : leurs nombres ne s'additionnent pas en fonctionnalités distinctes. Les tests ciblés couvrent aussi les conflits concurrents, les annulations de transaction sous panne injectée, le refus d'accès sans authentification, la réutilisation d'un ancien numéro sans héritage des documents et la restauration de sauvegarde. Ils sont disponibles avec `npm run test:patient-integrity` et intégrés à `npm run test:regression`.

Les tests utilisent uniquement des bases et identités synthétiques dans des répertoires isolés, sans envoi réel d'email ou de WhatsApp. Les colonnes d'archive sont ajoutées automatiquement à l'initialisation de la base ; cette migration n'a été exécutée que sur les fixtures. Les données déjà supprimées ou attribuées à une mauvaise personne ne sont pas réparées par ce code.

Le build avec accès réseau étendu n'a pas été exécuté : le contrôle automatique d'approbation a échoué à cause de la limite d'utilisation du compte. Il ne s'agissait pas d'un jugement de dangerosité. Le build ordinaire a ensuite échoué sur les polices ; la compilation de production de ce lot reste à valider dans un environnement autorisé.

## Suite du travail

Priorité aux constats P1 encore ouverts : QA-04 (cycle clinique et EVA), QA-07 (sauvegarde atomique), QA-05/08 (facturation idempotente et centimes), QA-06 (cohérence des identités). QA-09 à QA-19 restent également à corriger et à revalider. Aucun constat n'est déclaré entièrement clos sur la seule base du succès des suites existantes.
