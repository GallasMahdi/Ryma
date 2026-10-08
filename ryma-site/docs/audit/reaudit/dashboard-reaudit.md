# Ré-audit du dashboard Kine Ryma / Digital Clínica

Exécutions : 7–8 octobre 2026, Windows, Europe/Lisbon. Référence : [audit initial du 7 octobre](../dashboard-audit.md), puis [premier lot de corrections](../corrections/batch-01.md). Les preuves initiales restent historiques ; les preuves de ce ré-audit sont dans ce dossier.

## A. Résumé exécutif

**Les corrections des 19 anomalies initiales sont implémentées. Une vingtième anomalie découverte pendant la revalidation, la suppression destructive d’un dossier patient, est également corrigée. Aucun échec ne subsiste dans les tests exécutés sur la version finale.** La validation navigateur de QA-14 reste bloquée : les tests DOM passent, mais ne remplacent pas une recette clavier et mobile réelle.

**Verdict : prêt sous conditions pour une recette de préproduction ; preuves insuffisantes pour déclarer l’exploitation quotidienne en production validée.** Le code corrigé n’a pas été déployé. Les migrations n’ont pas été appliquées à la base réelle. Les conditions restantes concernent surtout la recette navigateur, la revue des données historiques et la restauration dans l’environnement d’exploitation.

Les pertes de données lors de l’archivage d’un rendez-vous, les fusions silencieuses de patients, les faux scores EVA, les sauvegardes cliniques partielles ou obsolètes, les doublons de facturation et les incohérences de montants ont des tests de non-régression passants. Les liens patient–rendez-vous–document sont vérifiés côté serveur. Les agrégats financiers nécessitent désormais le déverrouillage propriétaire. Les dépendances examinées ne présentent plus d’avis npm connu à la date du scan.

| Vérification finale | Résultat | Preuve |
|---|---|---|
| Suite SQLite, DOM, téléphone, avis, scheduling, WhatsApp simulé et reset | **150/150 PASS** | [suite.log](suite.log) |
| Intégrité, corrections, scheduling et WhatsApp sur libSQL en fichier | **120/120 PASS** | [libsql.log](libsql.log) |
| Contrôles dashboard/authentification | **36/36 PASS** | [dashboard.log](dashboard.log) |
| Scénarios sur serveur de production compilé | **38/38 PASS** | [http-results.json](http-results.json) |
| Compléments HTTP : rollback, CSV, recherche, documents, chemins publics | **9/9 PASS** | [extra-results.json](extra-results.json) |
| Recalcul indépendant depuis SQL | **20/20 PASS** | [metrics-verification.json](metrics-verification.json) |
| TypeScript et build de production | **PASS**, sorties 0 | [typecheck.log](typecheck.log), [build.log](build.log) |
| Dépendances de production et ensemble des dépendances | **0 vulnérabilité connue signalée** | [production](dependencies-after.json), [ensemble](dependencies-all-after.json) |
| PDF des modèles applicatifs : 2 factures et 2 prescriptions | **PASS** extraction et inspection visuelle, 7 pages au total | [résultats](pdf-inspection.json), [planche](pdf-contact-sheet.png) |
| Fichiers de données réelles | **16/16 inchangés** par SHA-256 depuis l’état avant corrections | [preservation.json](preservation.json) |

Ces suites se recoupent ; leurs compteurs ne constituent ni un nombre de parcours uniques ni un pourcentage de couverture. Une suite passante ne garantit pas l’absence de toute autre anomalie.

### Limites effectives

- **BLOCKED — navigateur de l’application :** la sélection du serveur local par le navigateur intégré a été refusée par sa politique d’accès. Aucun contournement par un autre pilote n’a été employé. Les captures UI du premier audit ne valident pas les modifications actuelles. Le focus, les brouillons et le retour au déclencheur sont testés avec React/jsdom ; le rendu, le tactile et les technologies d’assistance restent à contrôler dans un navigateur réel.
- **NOT TESTED — exploitation :** Turso distant, proxy, hébergement, rotation des vrais secrets, notifications externes, restauration d’une sauvegarde d’exploitation, conservation et droits système. SMTP est vide, WhatsApp désactivé ou simulé. Aucun message réel n’a été envoyé.
- **NOT TESTED — données historiques réelles :** les anciennes EVA et les montants fractionnaires sont préservés et explicitement signalés pour revue. Aucun dossier réel n’a été lu pour décider de sa validité clinique ou financière.
- Excel natif, coupure réseau pendant une saisie, deux onglets UI, lecteur d’écran, contraste mesuré et toutes les langues/largeurs ne sont pas revalidés. Les obligations professionnelles et fiscales ne sont pas certifiées par ces tests.
- Les premiers démarrages/accès HTTP ont échoué à cause du bac à sable Windows ; les mêmes contrôles ont ensuite réussi avec autorisation sur la copie isolée. Le rendu PDF supplémentaire a rencontré une expiration de revue automatique et une interruption prolongée ; le rejeu final a produit les quatre PDF avec sortie 0. Ce sont des limites d’exécution du harnais, pas des défauts applicatifs reproduits.

## B. Inventaire et couverture

Stack résolue : Next.js **16.3.6**, React/React DOM **19.2.8**, TypeScript **5.9.3**, better-sqlite3 **13.0.3**, @libsql/client **0.17.4**, nodemailer **10.0.16**. Les versions de sharp, nanoid et source-map-js sont également corrigées dans le lockfile. [Versions contrôlées](versions.json).

La copie isolée utilisée est `tmp/dashboard-fixes-20261007/project`, avec une nouvelle base `reaudit-fixture.db`, sans copie du dossier réel `data/` ni de `.env`. Le serveur compilé écoute uniquement sur `127.0.0.1:3119`. Le dossier porte le nom du premier lot parce que sa junction de dépendances est réutilisée ; ses sources ont été remplacées par les sources finales avant les tests. La base de ce ré-audit est distincte de celle du premier lot. Les tests de charge utilisent encore une autre fixture synthétique.

L’inventaire actualisé contient **32 fichiers API, 49 méthodes exportées, 38 méthodes protégées**, **489 sites JSX interactifs** et **101 lignes fonctionnelles**. Toutes les méthodes protégées ont reçu une requête sans session et ont répondu 401. Aucun Server Action `use server` n’a été découvert.

- [Matrice fonctionnelle complète](feature-matrix.md), avec méthode et limites par fonctionnalité.
- [Inventaire API actualisé](api-inventory.md), méthode par méthode.
- [Registre des contrôles UI](ui-controls.md), chaque exécution individuelle exhaustive marquée NOT TESTED.
- [Schéma, index, triggers et intégrité de la fixture](schema.json).
- [Empreintes des 249 fichiers source/scripts/manifestes](source-hashes.json).

Les nouveaux éléments de données comprennent `archivedAt`/`archivedStatus` sur les rendez-vous, le statut clinique, une EVA nullable, `completedAt`, une version et l’archivage sur les séances, `clinical_session_revisions`, ainsi que `amountCents` et `moneyReview` sur les factures. Les services de scheduling communs continuent de gérer praticiens, horaires, exceptions, capacités, ressources et idempotence. Les gardes de concurrence et migrations sont exécutées sur les deux adaptateurs locaux.

Fonctionnalités toujours absentes : comptes individuels/MFA, droits par patientèle, édition globale d’une série, archivage complet d’une fiche patient, interface de restauration des révisions cliniques et processus de correction fiscale certifié. Leur absence est distinguée des anomalies corrigées.

## C. Résultats par module

| Module | Résultat vérifié | Limite |
|---|---|---|
| Authentification | PASS : login, cookie de production, expiration simulée, révocation, limitation, propriétaire | Proxy et navigateur cross-site réels non testés |
| Agenda/disponibilités | PASS : création, déplacement, statuts, archivage, capacité et quatre courses concurrentes HTTP | Vues responsive non rejouées |
| Équipe | PASS : horaires, exceptions, ressources, affectations, versions et rollback sur deux adaptateurs | UI individuelle non exécutée |
| Récurrence | PASS : conflit intermédiaire sans insertion partielle, rejeu, changement d’heure/année | Gestion globale de série absente |
| Patients | PASS : identité stable, conflit explicite, contact modifié sans perte d’historique, validation, suppression protégée | Partage d’un numéro entre deux fiches toujours refusé explicitement |
| Clinique | PASS : EVA mesurée, séances planifiées séparées, lien au RDV, écriture atomique/versionnée, journal et conservation | Revue humaine de l’historique nécessaire |
| Facturation | PASS : clé d’intention, émission unique, identité, centimes, TVA, paiements | Validité fiscale de fond non établie |
| Prescriptions/PDF | PASS : données/API, quatre modèles PDF générés et inspectés | Dialogue système d’impression non piloté |
| Exports/analytics | PASS : filtres, encodage, cellules de formule neutralisées, autorisation, 20 recalculs | Excel natif et définitions prédictives non vérifiés |
| Avis/WhatsApp/SSE | PASS : suites avec transport simulé, modération, reprise, révocation du flux | Livraison externe et deux UI synchronisées non testées |
| Modalités de fermeture | PASS dans le DOM : Tab/Shift-Tab, Escape/Cancel, confirmation et restauration du focus | BLOCKED pour acceptation navigateur finale |

### Parcours A–F

A : patient → rendez-vous → séance sur ce rendez-vous → prescription → facture → CSV est désormais PASS au niveau HTTP. DATA-02 ne renvoie plus un conflit de créneau pour documenter le rendez-vous déjà réservé. Le lien est unique et vérifié.

B : conflit au milieu d’une série, rollback, résolution et rejeu sont PASS. Les séances produites sont PLANNED, avec EVA et date de réalisation nulles. Une annulation ne les transforme pas en soins réalisés.

C : déplacer une consultation non documentée libère l’ancien créneau et occupe le nouveau. L’archivage conserve la séance et les documents. Une consultation déjà documentée ne peut pas être déplacée vers un autre rendez-vous. PASS HTTP et suites.

D : page sans session/cookie forgé, 38 méthodes protégées et fichiers privés restent inaccessibles. Les chemins fictifs de fichiers reçoivent 307 sans livrer de base, `.env` ou PDF. PASS pour ces requêtes précises.

E : admin/admin, public/admin, blocage/création et déplacement/création simultanés ne produisent pas de double occupation. PASS sur les courses exécutées et sur les gardes SQL testées.

F : recherche/création/déplacement sur écran mobile réel est BLOCKED pour ce ré-audit. Le précédent parcours tactile reste une preuve historique uniquement.

### Montants, indicateurs et performance

L’instantané final de l’oracle contient **15 rendez-vous non archivés**, **3 factures non annulées**, **72,59 € payés**, **61,50 € en attente**, soit **134,09 € facturés**. Dix identités patient sont présentes dans les rendez-vous actifs de cette fixture. Les sommes timeline, pôles, modes de paiement et heatmap concordent avec SQL ; l’occupation concorde avec l’oracle minute par minute sur les horaires par défaut. Les mesures HTTP antérieures ont un instantané plus petit : les compléments ont ajouté une facture et un rendez-vous. [Recalculs finaux](metrics-verification.json).

La recette ne prétend pas recalculer chaque point de chaque graphe de rétention, prévision, churn ou assurance. Les estimations par tarifs catalogue et les recettes réellement encaissées restent des notions différentes. Les statistiques globales de facturation ne deviennent pas automatiquement le sous-total de chaque tableau filtré.

Sur **1 000 patients et 10 000 rendez-vous fictifs**, les fonctions SQLite mesurées donnent : agenda paginé avec résumé médiane **9,24 ms**, p95 **14,75 ms** ; annuaire 10 lignes médiane **9,74 ms** ; analytics toutes périodes médiane **443,49 ms**, p95 **476,12 ms**. L’export complet sérialise environ **6,36 Mo**. Les chemins non paginés restent un sujet de capacité à surveiller. Aucun seuil de SLA n’a été inventé. [Mesures et méthode](performance.json).

Les sept endpoints/pages mesurés en HTTP chaud local ont des médianes d’environ **15–17 ms** sur la petite fixture. Ces temps excluent le rendu du navigateur et ne constituent pas une mesure de LCP/FCP ni de charge distante. [Mesures HTTP](http-performance.json).

## D. Anomalies initiales et corrections

Les préconditions, étapes initiales, impacts et causes démontrées de QA-01 à QA-19 restent dans les [fiches originales](../dashboard-audit.md#d-fiches-danomalies). Le tableau suivant décrit le résultat final, sans réécrire les observations initiales. Les reproductions corrigées sont exécutables dans [HTTP](../tools/http-reaudit.cjs), [compléments](../tools/extra-reaudit.cjs), [intégrité](../../../scripts/test-patient-integrity.cjs), [corrections](../../../scripts/test-audit-remediation.cjs) et [DOM](../../../scripts/test-modal.cjs).

| ID / priorité initiale | Correction et résultat observé | Preuve de non-régression | État |
|---|---|---|---|
| QA-01 / P1 | DELETE RDV archive et libère la capacité ; séance/documents restent présents ; événement d’archive transactionnel | H DATA-09 ; S/L intégrité, rollback du journal | PASS |
| QA-02 / P1 | Historique consulté par patientId immuable ; liaison legacy et changement de contact atomiques ; snapshots documentaires conservés | H DATA-10 ; S/L contact, miroir et rollback | PASS |
| QA-03 / P1 | Création distincte sur numéro connu : conflit, jamais remplacement silencieux ; ambiguïtés legacy refusées | H DATA-11 ; S/L concurrence et documents sans patientId | PASS |
| QA-04 / P1 | PLANNED/COMPLETED/LEGACY_REVIEW distincts ; EVA inconnue null ; progression limitée aux séances réalisées | H DATA-08 ; S/L future, annulation, déplacement, EVA ; inspection calcul UI | PASS serveur/calcul |
| QA-05 / P1 | Clé d’intention obligatoire ; formulaire la conserve aux retries et bloque un second envoi immédiat | H DOC-04 ; X BILL-01 ; S/L requêtes parallèles, clé modifiée 409 | PASS API, UI inspectée |
| QA-06 / P1 | Identité, contact, prestation et praticien résolus/vérifiés avant émission ; garde contre changement concurrent du patient | H DOC-02/03 ; S/L permutations d’identifiants | PASS |
| QA-07 / P1 | Notes, EVA, état et révision sauvegardés dans une transaction | X CLIN-01 : HTTP 500 injecté, anciennes notes/EVA intactes ; S/L | PASS |
| QA-08 / P1 | Nouvelles factures en centimes entiers ; fractions refusées ; TVA/groupes/ticket cohérents ; historique douteux bloqué pour rapprochement | H DOC-05 ; M 20/20 ; S/L centimes, TVA, guard SQL | PASS |
| QA-09 / P2 | POST/PATCH partagent EVA null ou entier 0–10 ; pas de correction silencieuse | H DATA-04/05 ; S/L valeurs négatives, fractions, types invalides | PASS |
| QA-10 / P2 | Version requise, 428 sans version, 409 si obsolète ; révision précédente et auteur pseudonymisé conservés | H DATA-07 ; S/L deux écrivains, version après déplacement | PASS |
| QA-11 / P2 | Agrégats financiers absents sans grant propriétaire actif ; révocation après verrouillage ; fallback client supprimé | H AUTH-05/09 ; S/L grant/revoke | PASS |
| QA-12 / P2 | Date réelle non future, enums, longueur/types et nombre de séances validés ; omission et effacement distingués | H PROFILE-01 ; X CLIN-02 ; S/L | PASS |
| QA-13 / P2 | Filtres communs liste/CSV, période et date de paiement, pôle et bornes Lisbonne | H EXPORT-01 ; X CSV-02 ; S/L changements de jour et périodes vides | PASS |
| QA-14 / P2 | Portail dialog, fond inert, focus enfermé/restitué ; brouillon protégé sur Escape, fermeture, fond et Cancel | S test-modal : vrai React/DOM simulé ; inspection raccordement | PASS DOM / BLOCKED navigateur |
| QA-15 / P2 | Formulaire sélectionne un RDV existant ; API le documente sans réserver une seconde capacité | H DATA-02 ; S/L unicité, patient/service/praticien, rendez-vous futur | PASS API, UI inspectée |
| QA-16 / P2 | Next, nodemailer, sharp, nanoid, source-map-js mis à jour et lockfile aligné | npm audit production et complet : 0 ; build | PASS au scan |
| QA-17 / P2 | Tous les secrets de développement connus refusés en production, y compris hash du même mot de passe avec autre sel | D ; S/L tests bcrypt/configuration | PASS |
| QA-18 / P2 | Logs email réduits à des événements génériques ; pas de destinataire, identifiant message ou exception transport brute | S/L transport absent, succès et échec simulés | PASS pour logs applicatifs ciblés |
| QA-19 / P3 | Identité patient/document et n/N sur chaque page ; blocs et titres préservés à l’impression | 4 pages longues inspectées, 18 marqueurs de fin, aucun chevauchement observé | PASS sur fixtures |

H = http-results.json ; X = extra-results.json ; S/L = suite.log/libsql.log ; D = dashboard.log ; M = metrics-verification.json. Ces fichiers sont liés dans les sections A/B et dans la matrice.

Les mises à jour répondent notamment à l’[avis Next.js GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j). Le résultat d’audit npm concerne le lockfile final, pas une garantie générale sur le déploiement.

### QA-20 — Suppression d’une fiche détruisant l’historique — P1, corrigé

- **Module/environnement :** dossiers patients ; inspection du code puis tests SQLite/libSQL et serveur compilé isolés.
- **Préconditions :** compte administrateur avec déverrouillage propriétaire, patient possédant séance/notes/documents.
- **Reproduction initiale identifiée dans le code :** DELETE `/api/admin/patients?id={id}` appelait `dbDeletePatientRecord`, qui supprimait explicitement séances, prescriptions, notes et patient. La fiche UI lançait deux requêtes, retirait immédiatement la sélection et annonçait un succès sans vérifier le statut HTTP. Aucun effacement de donnée réelle n’a été exécuté pour reproduire ce défaut.
- **Attendu :** aucune perte d’historique par une suppression administrative ordinaire ; refus visible, fiche conservée.
- **Cause démontrée :** DELETE physiques dans la fonction DB et flux UI optimiste non conditionné à la réponse.
- **Correction :** suppression limitée aux coquilles administratives sans historique. Une garde SQL et les suppressions de fiche vide s’exécutent dans la même transaction. Rendez-vous, notes, séances, révisions, factures ou prescriptions entraînent 409 `PATIENT_HAS_HISTORY`. La UI fait une seule requête, affiche le refus et conserve la fiche jusqu’à un succès confirmé.
- **Résultat :** H RETAIN-01 renvoie 409, patient et séances identiques après la tentative ; S/L QA-20 confirme également qu’une fiche vraiment vide peut être retirée.
- **Impact évité :** disparition d’un dossier clinique complet. Ce garde-fou ne définit pas une politique légale de purge ; aucun contournement destructif n’a été ajouté.

## E. Cohérence et conservation des données

| Relation | Résultat final |
|---|---|
| Rendez-vous ↔ patient | patientId conservé ; téléphone ne remplace pas l’identité ; conflits explicites |
| Rendez-vous ↔ disponibilité | capacité libérée par annulation/archivage ; déplacements et courses atomiques |
| Séance ↔ patient/RDV | patient vérifié, un lien clinique par RDV ; date/heure du RDV utilisées ; version contrôlée |
| Prescriptions/factures ↔ patient/prestation | mélange d’identités refusé ; snapshots historiques conservés au changement de contact |
| Clinique ↔ progression/EVA | seules séances COMPLETED non archivées comptées ; seules mesures numériques réalisées tracées |
| Factures ↔ analytics/CSV | centimes cohérents, mêmes filtres et dates ; 20 recalculs passants |
| Public ↔ administration | source de réservation partagée ; lecture agenda et disponibilité concordantes |

La migration clinique ne peut pas savoir si une ancienne EVA 5 était une vraie mesure ou une valeur automatique. Elle conserve la valeur dans `legacyEvaPainScore`, met le dossier en **LEGACY_REVIEW** et retire cette valeur des indicateurs jusqu’à vérification. Elle ne fabrique ni date de réalisation ni diagnostic. Le personnel devra confirmer les séances et mesures valides.

Les montants historiques exactement représentables en centimes reçoivent `amountCents`. Un montant comme 10,005 reste inchangé, marqué **moneyReview** ; les agrégats/export/impression financiers concernés sont suspendus au lieu de publier un total corrigé arbitrairement. La résolution des documents émis exige un rapprochement approprié ; elle n’a pas été exécutée sur la base réelle.

Les sauvegardes incluent les nouvelles colonnes et révisions. La restauration et la migration de schémas anciens sont exercées sur fixtures locales. Cela ne prouve pas la disponibilité d’une sauvegarde exploitable sur l’hébergement réel.

Le modèle reste celui d’un administrateur partagé. L’empreinte de session dans le journal distingue des sessions, pas des professionnels nominatifs. L’accès admin aux factures individuelles existe toujours : la protection des KPI propriétaire n’empêche pas une addition manuelle des lignes autorisées.

Les 16 fichiers réels vérifiés n’ont pas changé depuis le début des corrections. Le fichier `data/ryma.db` était déjà modifié dans Git avant cette intervention ; le statut Git seul n’a donc pas servi de preuve de préservation. Les modifications préexistantes de l’utilisateur ont été conservées.

## F. Plan d’action restant

Les corrections de code QA-01 à QA-20 sont terminées dans le workspace. Les actions suivantes portent sur l’acceptation et l’exploitation, sans déploiement automatique.

| Étape | Priorité | Dépendance | Effort indicatif et incertitude |
|---|---|---|---|
| Rejouer mobile/desktop, focus, fermeture, dossiers, facture retry, lien de séance | Avant production / P1 recette | Navigateur interactif autorisé sur la version corrigée | 1–3 h ; plus si défaut visuel découvert |
| Tester migration + restauration sur copie contrôlée des données d’exploitation | Avant production / P1 | Sauvegarde récente, accès préproduction, responsable données | 2–6 h techniques ; dépend fortement du volume/qualité |
| Réconcilier LEGACY_REVIEW et éventuels moneyReview | Avant usage des indicateurs / P1 | Personnel clinique et responsable facturation | Impossible à chiffrer sans nombre de cas ; inventaire préalable 1–2 h |
| Vérifier secrets, proxy, stockage, grants et journaux dans l’hébergement cible | Avant production / P1 | Accès opérateur et configuration réelle | 1–3 h ; notifications avec destinataires de test approuvés uniquement |
| Valider le processus documentaire/comptable et la conservation | Avant émission réelle / P1 | Responsable clinique/comptable | 2–8 h de revue indicative ; décision externe à l’audit logiciel |
| Tester deux onglets, réseau perdu, expiration pendant saisie, Excel, accessibilité/langues | Prochaine recette / P2 | Navigateur/Excel et profils de test | 2–5 h ; profondeur à convenir |
| Formaliser les définitions des métriques prédictives et limiter les lectures/export non paginés | Prochaine itération / P2 | Définitions produit et volumes cibles | 1–3 jours ; pas de SLA actuellement défini |
| Comptes nominatifs, partage de contacts, archive de fiche et consultation des révisions | Évolution / P2 | Politique de rôles, conservation et identité | 3–8 jours par ensemble cohérent ; estimation à préciser avec le périmètre |

## G. Checklist de revalidation

- [x] QA-01 : archiver libère le créneau et conserve séance, notes, documents et trace ; panne du journal annule l’opération.
- [x] QA-02/03 : contact modifié conserve les historiques ; autre personne sur même numéro ne remplace aucune identité ; legacy ambigu refusé.
- [x] QA-04 : planifier/annuler/déplacer ne crée aucune EVA ni séance réalisée ; compléter dans le futur est refusé, même sans heure envoyée.
- [x] QA-05/06 : retry parallèle crée un seul numéro ; changement de contenu avec même clé renvoie 409 ; permutations d’identité/prestation rejetées.
- [x] QA-07/09/10 : une panne n’écrit aucun champ ; EVA invalide rejetée ; version obsolète refusée et ancienne révision conservée.
- [x] QA-08 : centimes/TVA/groupes/tickets concordants ; montant historique douteux préservé et signalé.
- [x] QA-11 : agrégats absents avant déverrouillage et après verrouillage ; endpoints propriétaire refusés à l’admin seul.
- [x] QA-12/13 : profil invalide refusé ; omission/effacement respectés ; CSV et listes honorent filtres, période et Lisbonne.
- [x] QA-14 : tests DOM de focus, Tab inverse, Escape/Cancel, conservation du brouillon et retour au déclencheur.
- [ ] QA-14 : valider ces comportements dans un navigateur réel, sur mobile et au clavier.
- [x] QA-15 : un rendez-vous existant peut recevoir une seule séance sans deuxième réservation ; consultation documentée non déplaçable.
- [x] QA-16/17/18 : scan final sans avis ; secrets connus rejetés ; aucune identité patient dans les logs email simulés.
- [x] QA-19 : chaque page porte patient/document et numéro ; 18 instructions longues complètes, sans chevauchement constaté.
- [x] QA-20 : une fiche avec historique ne peut pas être supprimée ; une fiche vide peut l’être ; UI inspectée pour réponse d’échec.
- [ ] Revue clinique/financière historique, restauration préproduction et configuration d’exploitation validées par les responsables.

### Reproduire les contrôles

Depuis `ryma-site`, `node docs/audit/tools/run-reaudit.cjs prepare` recopie uniquement sources/scripts/public/configuration vers la copie isolée. Les modes `suite`, `libsql`, `dashboard`, `typecheck` et `build` produisent leurs logs ici. Le mode `start` utilise le port local 3119 et des secrets synthétiques. Les scripts HTTP attendent une fixture vierge ; ne pas les exécuter sur une base contenant des données réelles, ni supposer qu’un rejeu sur une fixture déjà remplie donnera les mêmes numéros/créneaux. Les outils de ce dossier sont des harnais d’audit, pas des migrations manuelles de production.

Les sorties npm, les captures PDF, les logs de tests et les empreintes de sources constituent la preuve de cette version locale. Le [rapport initial](../dashboard-audit.md) reste conservé pour comparer avant/après.
