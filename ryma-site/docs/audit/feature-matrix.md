# Matrice fonctionnelle — 7 octobre 2026

Cette matrice se lit avec [le rapport](dashboard-audit.md), [les 49 méthodes API](api-inventory.md) et [le registre des 483 sites de contrôles UI](ui-controls.md). E = exécution ; I = inspection ; H = hypothèse. Une ligne PASS n'engage que le scénario et la méthode indiqués. Les contrôles UI non exercés individuellement restent NOT TESTED dans le registre, même si leur service serveur a été testé.

Preuves abrégées : H = [HTTP](evidence/http-results.json), X = [compléments HTTP](evidence/extra-results.json), D = [36 contrôles dashboard](evidence/dashboard.log), S = [suite SQLite](evidence/suite.log), L = [suite libSQL locale](evidence/libsql.log), U = [navigateur](evidence/ui-results.json), M = [recalculs SQL](evidence/metrics-verification.json), P = [performance](evidence/performance.json). Les identifiants QA renvoient aux fiches du rapport. Les fichiers source sont accessibles dans les inventaires.

| Module | Fonctionnalité | Route/UI | API/action | Tables concernées | Règle métier | Méthode de vérification | Résultat | Preuve |
|---|---|---|---|---|---|---|---|---|
| Auth | Connexion correcte/incorrecte | /admin/login | POST /api/admin/login | rate_limit_log | Session après mot de passe valide | E, HTTP réel | PASS | H AUTH-03 |
| Auth | JSON null, champs invalides | Login et formulaires | POST/PATCH protégés | selon module | Rejeter avant écriture | E, handlers isolés | PASS | D lignes 7, 11 ; cas testés seulement |
| Auth | Page anonyme/cookie forgé | /admin | proxy | — | Redirection login | E, HTTP | PASS | H AUTH-02 |
| Auth | 38 méthodes protégées | Toutes les API admin gardées | Voir api-inventory.md | Toutes | Sans session : 401 | E, appels directs de chaque méthode | PASS | H AUTH-01 |
| Auth | Déconnexion/rejeu | En-tête Sair | POST logout, GET me | revoked_sessions | Cookie révoqué inutilisable pour données | E, HTTP + handlers | PASS | H AUTH-07 ; D 32 |
| Auth | Page après révocation | /admin | proxy | revoked_sessions non interrogée ici | Shell encore servi, API refusées | E + I | PASS | H AUTH-07 ; aucun accès aux données démontré |
| Auth | Expiration absolue 8 h | Toute session | requireAdmin | revoked_sessions | Reseal ne prolonge pas l'âge absolu | E, horloge/cookie simulés | PASS | D 2, 4 ; pas d'attente réelle de 8 h |
| Auth | Cookie de production | Login | iron-session | — | Secure, HttpOnly, SameSite=Lax | E, HTTP | PASS | H AUTH-03, Max-Age 28800 |
| Auth | Limitation des erreurs | Login | POST login | rate_limit_log | Blocage après 10 erreurs | E, HTTP local | PASS | H AUTH-08 : 401×10 puis 429 |
| Auth | Comptes individuels/MFA | — | — | Pas de table utilisateurs | Admin partagé + secret propriétaire | I, découverte | NOT APPLICABLE | Fonctionnalités absentes ; pas de cloisonnement par soignant |
| Auth | Déverrouillage propriétaire | Analytics / OwnerAuthModal | verify, lock, password | owner_step_up_grants, security_settings, security_audit_logs | Grant serveur temporaire ; rotation révoque | E, HTTP et handlers | PASS | H AUTH-04/06 ; D 31/33 |
| Auth | Confidentialité des agrégats | KPI masqués | GET invoices/appointments | invoices, appointments | Ne pas transmettre avant déverrouillage annoncé | E + I | FAIL | H AUTH-05 ; QA-11 |
| Auth | CSRF export | Export CSV | GET export | selon export | Rejeter contexte cross-site | E, HTTP avec en-têtes | PASS | X AUTH-09 : 403 |
| Auth | CSRF mutations | Formulaires | POST patients | patients | Origin étranger non explicitement rejeté | E, cookie ajouté manuellement | NOT TESTED | X AUTH-10 : 200 ; aucun contournement navigateur de SameSite prouvé |
| Auth | Secrets connus dans JS client | Build production isolé | .next/static | — | Aucune constante serveur connue | E, recherche exacte dans 105 fichiers | PASS | client-secret-scan.json ; secrets de production inconnus non testés |
| Auth | Configuration par défaut | Serveur | env.ts | — | Refus de tous secrets publics en production | E + I | FAIL | D dernier contrôle ; QA-17, risque conditionnel |
| Agenda | Vues semaine/cartes/tableau | /admin?tab=appointments | GET appointments | appointments, practitioners | Affichage des occurrences connues | E, navigateur, navigation ciblée | PASS | U UI-VIEWS ; captures agenda/table |
| Agenda | Vue journée/équipe, vue par date | AgendaViewControls | GET appointments | appointments | Parité complète des vues | I seulement | NOT TESTED | Registre UI, toutes combinaisons non parcourues |
| Agenda | Fin d'année / navigation semaine | Semaine 28/12 → 04/01 | GET appointments | appointments | Date et heure conservées | E, navigateur | PASS | U UI-VIEWS ; week-year-boundary.jpg |
| Agenda | Création manuelle | Nova Consulta | POST appointments | appointments, patients | Validation + disponibilité commune | E HTTP et navigateur mobile | PASS | H DATA-01 ; U UI-F |
| Agenda | Déplacement libre/sur soi | AppointmentDetailModal / RescheduleAppointment | PATCH appointments/[id] | appointments, patient_sessions | Exclure son ID ; libérer ancien créneau | E HTTP + navigateur | PASS | H SCHED-01 ; U UI-F |
| Agenda | Déplacement occupé/chevauchement | Même formulaire | PATCH + garde SQL | appointments, blocked_slots | Respect durée/buffers/praticien/ressource | E, suites et courses HTTP | PASS | S, L, H RACE-04 |
| Agenda | Modifier tous les champs simultanément | Détail / modification RDV | PATCH appointments/[id] | appointments | Cohérence identité/service/durée/notes | I + tests partiels | NOT TESTED | Déplacement et statut testés ; pas chaque combinaison UI |
| Agenda | Statuts réels | Menu statut | PATCH appointments/[id] | appointments | 5 valeurs ; 25 transitions acceptées sur créneau libre | E HTTP | PASS | H SCHED-02 ; table du rapport |
| Agenda | Suppression logique | Action supprimer | DELETE appointments/[id] | appointments, patient_sessions | Conservation clinique et archivage attendus | E HTTP + SQL | FAIL | H DATA-09 ; QA-01 ; suppression logique absente |
| Agenda | Rejeu d'une création | Formulaires | Clé d'idempotence/règles créneau | idempotency_keys, appointments | Pas de double occupation | E suites + courses ; clic rapide non exécuté | PASS | S, L, H RACE-01/02 ; limite UI explicite |
| Agenda | Recherche/tri/filtre/pagination | Barre et tableau | GET appointments | appointments | Tri date/heure, bornes pagination | E partiel + I | PASS | D 18, P, U UI-VIEWS ; reset/combinatoire NOT TESTED |
| Agenda | Raccourcis, palette, aide, langues | En-tête/sidebar | Actions client | — | Navigation clavier et aides | I inventaire uniquement | NOT TESTED | ui-controls.md, AdminCommandPalette/ClinicHelpdeskDrawer |
| Disponibilités | Créneaux publics/admin | Onglet slots | GET /api/slots, /api/admin/slots | horaires, exceptions, réservations, ressources | Même moteur pour lecture et mutation | E HTTP + suites | PASS | H SCHED-01/03 ; S, L |
| Disponibilités | Blocage/déblocage simple | Calendrier créneaux | POST slots | blocked_slots | Interdire conflit actif | E, suites et course HTTP | PASS | H RACE-03 ; D 16 |
| Disponibilités | Journée/plage, validation bulk | Sélection groupée | POST slots/bulk | blocked_slots | Actions/heures/plages valides | E handlers, pas chaque bouton UI | PASS | D 17 ; S, L |
| Équipe | Praticiens : créer/éditer/activer | /admin?tab=team | POST practitioners | practitioners, practitioner_services | Affectation valide, pas d'horaire orphelin | E suites ; lecture UI | PASS | S, L, U UI-TEAM ; clics individuels NOT TESTED |
| Équipe | Horaires clinique et praticien | Team HoursPanel | POST practitioners (action) | working_hours | Ouverture, pauses, dimanches configurables | E suites ; lecture écran | PASS | S, L ; captures team-hours ; défaut Lun–Sam 45 h/semaine |
| Équipe | Exceptions/congés/fermetures | ExceptionsPanel | POST practitioners (action) | schedule_exceptions | Exception appliquée au moteur public | E suites | PASS | S, L ; UI individuelle NOT TESTED |
| Équipe | Salles/ressources/capacité | ResourcesPanel | POST practitioners (action) | resources, service_resources | Capacités et ressources obligatoires | E suites / SQL brut | PASS | S, L ; UI individuelle NOT TESTED |
| Équipe | Versions et conflits de configuration | Formulaires équipe | POST practitioners | booking_sync, configuration | Refuser configuration obsolète | E suites + I dialogue | PASS | S, L ; team-ui.tsx |
| Récurrence | Prévisualisation/création hebdomadaire | Múltiplas Sessões | POST multiple/preview, multiple | appointments, patient_sessions, idempotency_keys | Série atomique, praticien commun | E HTTP + suites | PASS | H SERIES-01 ; D 27 |
| Récurrence | Conflit intermédiaire/rejeu | Même formulaire | POST multiple | mêmes tables | Rollback complet ; mêmes IDs au rejeu | E HTTP + SQL | PASS | H SERIES-01 |
| Récurrence | Heure Lisbonne / fin d'année | Dates de la série | POST multiple | appointments | Conserver 14:00 local | E HTTP | PASS | H SERIES-02 ; D 26 |
| Récurrence | Occurrence déplacée/annulée | Éditer une occurrence | PATCH appointments/[id] | appointments, patient_sessions | Propager lien clinique correctement | E + I | FAIL | H DATA-08 ; QA-04 ; date/heure déplacées dans booking-service |
| Récurrence | Édition/suppression globale de série | — | Pas d'endpoint dédié trouvé | — | Gestion d'une série entière | I découverte | NOT APPLICABLE | Occurrences individuelles seulement |
| Concurrence | Admin/admin et public/admin | API | POST appointments | appointments, patients | Une seule réservation concurrente | E HTTP réel | PASS | H RACE-01/02 : un 201, un 409 |
| Concurrence | Blocage/création, déplacement/création | API | POST/PATCH | appointments, blocked_slots | Un seul gagnant | E HTTP réel | PASS | H RACE-03/04 |
| Fiabilité | Conflit SQL, verrouillage, rollback | Couche DB | Adapter/transactions/triggers | tables scheduling | Pas d'orphelin ; retry/503 | E suites sur 2 adaptateurs locaux | PASS | S, L ; pas de Turso distant |
| Patients | Création, édition, notes/profil | /admin?tab=patients | POST patients | patients, patient_notes | Champs omis préservés | E HTTP + handlers | PASS | H DATA-01 ; D 8–10 |
| Patients | Téléphone PT/international | Formulaires | validation phone | patients | Normalisation via libphonenumber | E suite dédiée | PASS | S test-phone-validation ; plusieurs formats |
| Patients | Changement du téléphone lié | Fiche patient | POST patients / GET historique | patients, notes, appointments, documents | Historique reste accessible | E HTTP + UI | FAIL | H DATA-10 ; QA-02 |
| Patients | Deux personnes, même téléphone | Nouveau patient | POST patients | patients | Rejet explicite ou personnes distinctes | E HTTP | FAIL | H DATA-11 ; QA-03 |
| Patients | Date de naissance/genre/couverture | Fiche patient | POST patients | patients | Valeurs valides côté serveur | E HTTP | FAIL | X CLIN-02 ; QA-12 |
| Patients | Recherche accents et longueur | Annuaire | GET patients?directory=1 | patients, patient_notes | Recherche stable sans erreur | E HTTP + UI | PASS | X SEARCH-01 ; accent exact, pas de translittération ; % joker |
| Patients | Archivage | Fiche patient | DELETE patients propriétaire | patients, séances, prescriptions | Archivage réversible | I | NOT APPLICABLE | Absent ; suppression physique disponible, conséquences en rapport |
| Patients | Confirmation et suppression complète UI | Bouton supprimer | DELETE patients | patients + dépendances | Accord propriétaire et retour fiable | I + protection API seulement | NOT TESTED | H AUTH-01 ; pas de parcours destructif UI complet |
| Clinique | Séance historique, EVA 0/10, accents | Dossier | POST/PATCH sessions | patient_sessions | Notes et bornes enregistrées | E HTTP | PASS | H DATA-03 |
| Clinique | Rattacher séance au RDV existant | Ajouter séance | POST patients/[id]/sessions | appointments, patient_sessions | Réutiliser le rendez-vous existant | E HTTP + I | FAIL | H DATA-02 ; QA-15 ; fonction de rattachement absente |
| Clinique | EVA invalide en modification | EVA | PATCH sessions | patient_sessions | Entier 0–10, aucune correction silencieuse | E HTTP | FAIL | H DATA-04/05 ; QA-09 |
| Clinique | Séance d'un autre patient | URL patient modifiée | PATCH sessions | patient_sessions | Vérifier session.patientId | E HTTP | PASS | H DATA-06 : 404 |
| Clinique | Progression/EVA chronologique | Fiche, barre/courbe | GET patients | patient_sessions | Seulement séances réalisées, EVA mesurée | E HTTP + UI + I | FAIL | H DATA-08 ; QA-04 |
| Clinique | Édition concurrente des notes | Dossier | PATCH sessions | patient_sessions | Détecter version obsolète | E HTTP | FAIL | H DATA-07 ; QA-10 |
| Clinique | Atomicité sur erreur SQL | Dossier | PATCH sessions | patient_sessions | Tout ou rien | E, panne SQL injectée dans fixture | FAIL | X CLIN-01 ; QA-07 |
| Clinique | Historique de modifications | — | Pas de journal clinique dédié | security_audit_logs limité | Auteur/ancienne valeur/restauration | I | NOT APPLICABLE | Fonction absente ; requise dans plan d'action |
| Prescriptions | Créer/lire/supprimer | Fiche, CreatePrescriptionModal / PrescriptionDetailModal | GET/POST prescriptions, DELETE [id] | prescriptions | Schéma et accès admin | E HTTP + handlers | PASS | H DOC-01 ; D 22/29 |
| Prescriptions | Modifier prescription émise | — | Pas de PUT/PATCH découvert | — | Révision d'un document existant | I | NOT APPLICABLE | Création/suppression ; gestion de versions absente |
| Documents | Identité patient et rendez-vous | Prescription/facture | POST documents | patients, appointments, documents | Identifiants et snapshots cohérents | E HTTP | FAIL | H DOC-02/03 ; QA-06 |
| PDF | Facture et prescription courtes | Impression client | invoicePdf/prescriptionPdf | données API | Texte, accents, total corrects | E HTML original → Chrome PDF → rendu inspecté | PASS | 4 PDF, pdf-inspection.json, contact-sheet |
| PDF | Prescription longue multipage | Impression | même générateur | prescriptions | Texte complet, pages identifiables | E génération/rendu/extraction | FAIL | 18 fins de texte présentes, 4 pages ; QA-19 pagination/identité |
| PDF | Téléchargement via dialogue système | Bouton imprimer | window.print | — | Enregistrement final par utilisateur | Non exécuté | NOT TESTED | Templates validés, dialogue OS non piloté |
| PDF | Route publique fichier PDF | URL fabriquée | Route inexistante | — | Pas de fichier exposé | E HTTP sans redirection automatique | PASS | public-path-verification.json : 307 vers accueil |
| Factures | Création/numéro unique | /admin?tab=invoices | POST invoices | invoices, invoice_sequences | Séquence FT année/numéro | E HTTP + suites | PASS | H DOC-01/04 ; numéros distincts, doublons métier QA-05 |
| Factures | NIF/TVA/exonération | CreateInvoiceModal | POST invoices | invoices | 9 chiffres ; défaut ; taux autorisés | E HTTP + I | PASS | X BILL-02 ; validation fiscale de fond hors preuve |
| Factures | Fractions de centime/agrégats | KPI/table/PDF | POST invoices, GET analytics | invoices | Unités monétaires et arrondis cohérents | E HTTP + SQL + UI | FAIL | H DOC-05 ; M ; QA-08 |
| Factures | Idempotence avec clé | API | POST invoices | idempotency_keys, invoices | Même clé/même contenu : même ID | E concurrent | PASS | H DOC-04 ; D 24 |
| Factures | Nouvelle soumission formulaire | CreateInvoiceModal | POST sans clé | invoices | Pas de deuxième facture involontaire | E HTTP reproduisant payload UI + I | FAIL | X BILL-01 ; QA-05 |
| Factures | Paiement/annulation gelée | Actions factures | PUT/DELETE invoices/[id] | invoices | paidAt stable/effacé ; annulation propriétaire | E HTTP + handlers | PASS | X BILL-02 ; D 19–21 |
| Factures | Notes de crédit, système fiscal certifié | — | Non établi | — | Processus fiscal à valider séparément | I limitée | NOT TESTED | Aucun certificat ni validation comptable vérifié |
| Exports | CSV RDV/factures autorisé | CSV / Exportar | GET export, invoices/export | appointments, invoices | Propriétaire requis | E HTTP | PASS | H AUTH-04/06 |
| Exports | UTF-8, guillemets, lignes/formules | CSV | Sérialiseur | mêmes tables | Données échappées | E contenu exporté | PASS | X CSV-01 ; csv-escaping.csv ; pas de BOM |
| Exports | Respect filtres affichés/période | Facturation/analytics | GET exports | invoices | Export conforme à sélection | E HTTP + I | FAIL | X CSV-02 ; M période 2020 ; QA-13 |
| Exports | Ouverture native Excel | Excel | — | — | Colonnes/accents/dates au poste cible | Non exécuté | BLOCKED | Pas de session Excel contrôlable ; accès au poste/session nécessaire |
| Analytics | Statuts, montants bruts, volumes | /admin?tab=analytics | GET analytics | appointments, invoices | Recalcul SQL indépendant | E, 20 assertions | PASS | M 17/20 ; écarts financiers/export séparés QA-08/13 |
| Analytics | Occupation horaires par défaut | Carte occupation | GET analytics | working_hours, appointments | Minutes occupées/capacité | E oracle minute par minute | PASS | M : 650/46320 → 1 % ; pas toutes configs |
| Analytics | Pôles, timeline, heatmap | Graphiques | GET analytics | appointments, invoices | Sommes concordantes | E SQL pour sommes seulement | FAIL | M : volumes exacts, recettes arrondies divergentes QA-08 |
| Analytics | Entonnoir/rétention/churn/prévisions | Graphiques spécialisés | GET analytics | appointments, invoices | Définitions métier à approuver | I uniquement | NOT TESTED | Contrat et recalcul point par point non établis |
| Avis | Lire/modérer/supprimer | /admin?tab=reviews | GET/PATCH/DELETE reviews | reviews | Avis modéré et suppression persistés | E handlers | PASS | D 30 ; S validation avis |
| Avis | Parcours public complet → modération UI | Formulaire public/onglet avis | POST reviews | reviews | Rafraîchissement entre deux interfaces | Non exécuté bout en bout | NOT TESTED | Services testés séparément |
| Sync | Public → admin ; admin → indisponible | Réservation / agenda | POST appointments, GET slots | booking_sync, appointments | Une source commune | E HTTP | PASS | H SCHED-01/03, RACE-02 |
| Sync | SSE changement DB, révocation | Indicateur Direto | GET events | booking_sync, revoked_sessions | Propager modifications et fermer accès | E handlers/suites | PASS | D 23 ; S et L détection ~3 s |
| Sync | Deux onglets navigateur simultanés | Deux dashboards | EventSource/refetch | mêmes tables | Parité visible après mutations | Non exécuté | NOT TESTED | Tests SSE serveur ne valident pas deux UI ouvertes |
| WhatsApp | Webhook signé/jobs/retries | Widget diagnostics | jobs/webhook, GET admin/whatsapp | tables WA initialisées dans tests | Autorisations dédiées, idempotence, reprise | E suites avec transport mock | PASS | S, L ; aucune livraison externe |
| Notifications | Email/SMS/WhatsApp réel | Liens/boutons/envoi | SMTP/Meta externes | selon intégration | Aucun envoi réel autorisé | Désactivés/mocks | NOT TESTED | Consigne d'audit ; aucun SMS autonome découvert |
| Santé | Healthcheck DB | /api/health | GET | base | Réponse contrôlée | I uniquement | NOT TESTED | api-inventory.md |
| Sauvegardes | Export backup/restauration CLI | Export propriétaire/scripts | GET export?type=backup | tables de backup | Protéger et restaurer les données | E tests reset ; I export ; restauration exploitation non exécutée | NOT TESTED | S test-reset ; sauvegardes prod/ACL/chiffrement inconnus |
| Sécurité | Paramètres SQL / affichage React | Couche DB et composants | requêtes paramétrées | toutes | Ne pas interpréter texte saisi | E recherche SQL ciblée + I | PASS | X SEARCH-01 pour ce payload seulement ; audit XSS complet NOT TESTED |
| Sécurité | Journaux données personnelles | Serveur email | console.log | — | Minimiser identifiants patients | I source | FAIL | QA-18, email.ts lignes 484/507 |
| Sécurité | Dépendances de production | package-lock | npm audit --omit=dev | — | Absence d'avis non traités | E analyse registre + lecture advisories | FAIL | dependencies-audit.json ; QA-16 |
| UX | Responsive 360/390/768/1440 | Agenda, patients, factures, équipe | UI | — | Contrôles principaux accessibles | E captures + largeur DOM agenda | PASS | U : aucun débordement page agenda ; pas toutes pages/états |
| UX | Mobile recherche/créer/déplacer | 360 px | mêmes API admin | patients, appointments | Parcours mobile utilisable | E navigateur | PASS | U UI-F ; mobile-rescheduled.jpg |
| UX | Focus/clavier/fermeture modale | Nova Consulta | ResponsiveModal | — | Focus enfermé et saisie protégée | E navigateur + I | FAIL | U UI-MODAL ; QA-14 |
| UX | Contraste/lecteur d'écran/langues | Tout dashboard | UI | — | Accessibilité complète | Non exécuté exhaustivement | NOT TESTED | Pas de validation WCAG revendiquée |
| Fiabilité | Réseau coupé/réponse tardive/session expirée en saisie | Formulaires | fetch | — | Brouillon conservé, reprise explicite | Non exécuté au navigateur | NOT TESTED | Erreurs HTTP/SQL testées séparément |
| Performance | Volumes 100/500 et 1000/10000 | Fonctions serveur | lectures/écritures | SQLite isolée | Mesure sans seuil inventé | E benchmark | PASS | P ; aucune certification de charge production |
| Performance | Chargement et navigation perçus | Navigateur | HTML/JS/render | — | Mesures FCP/LCP, interaction | Non instrumenté | NOT TESTED | http-performance.json mesure HTTP chaud uniquement |

Les chemins de fichiers testés comme publics ne livrent aucune base ni fichier .env : la première assertion PUBLIC-01 de X suivait une redirection et était incorrecte. Seul le résultat corrigé de public-path-verification.json doit être retenu. AUTH-10 décrit une absence de rejet explicite d'Origin ; son FAIL brut ne prouve pas une attaque CSRF de navigateur.
