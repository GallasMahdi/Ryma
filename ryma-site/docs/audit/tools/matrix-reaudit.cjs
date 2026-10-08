const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const rows=fs.readFileSync(path.join(root,'feature-matrix.md'),'utf8').split('\n').filter(l=>l.startsWith('| ')).slice(1).map(l=>l.split('|').slice(1,-1).map(x=>x.trim()));
const proofs={
  '01':'H DATA-09 ; S/L test-patient-integrity : archivage, rollback, capacité, snapshots',
  '02':'H DATA-10 ; S/L test-patient-integrity : patientId, téléphone, miroir legacy atomique',
  '03':'H DATA-11 ; S/L test-patient-integrity et test-audit-remediation : conflit explicite, identités legacy',
  '04':'H DATA-08 ; S/L test-audit-remediation : PLANNED/null, déplacement, annulation, achèvement futur refusé',
  '05':'H DOC-04 ; X BILL-01 ; S/L test-audit-remediation ; inspection CreateInvoiceModal',
  '06':'H DOC-02/03 ; S/L test-audit-remediation : patient, contact, service, praticien',
  '07':'X CLIN-01 ; S/L test-audit-remediation : injection SQL, rollback complet',
  '08':'H DOC-05 ; M 20/20 ; S/L test-audit-remediation : centimes, TVA, héritage à rapprocher',
  '09':'H DATA-04/05 ; S/L test-audit-remediation : null ou entier 0–10',
  '10':'H DATA-07 ; S/L test-audit-remediation : un 200, un 409, révision conservée',
  '11':'H AUTH-05/09 ; S/L test-audit-remediation : grant propriétaire et révocation',
  '12':'H PROFILE-01 ; X CLIN-02 ; S/L test-audit-remediation',
  '13':'H EXPORT-01 ; X CSV-02 ; M ; S/L : filtres communs, Lisbonne, date paiement',
  '14':'S test-modal : DOM simulé, Tab/Shift-Tab, Escape/Cancel, brouillon et retour focus ; navigateur BLOCKED',
  '15':'H DATA-02 ; S/L test-audit-remediation : un RDV/une séance ; inspection sélecteur UI',
  '16':'dependencies-after.json et dependencies-all-after.json : 0 avis ; versions.json',
  '17':'D ; S/L test-audit-remediation : mots de passe publics refusés même avec autre sel bcrypt',
  '18':'S/L test-audit-remediation : SMTP simulé, adresse/nom/téléphone/exception absents des logs',
  '19':'pdf-inspection.json, pdf-contact-sheet.png : 4 pages, 18 fins, identité et pagination partout',
};
function set(r,rule,method,status,proof){r[5]=rule;r[6]=method;r[7]=status;r[8]=proof;}
for(const r of rows){
  const feature=r[1],old=r.join(' '),qa=[...old.matchAll(/QA-(\d\d)/g)].map(m=>m[1]);
  if(qa.length){
    r[6]='E : tests cités ; I : raccordement UI';r[7]='PASS';r[8]=[...new Set(qa)].map(id=>proofs[id]).join(' ; ');
    if(qa.includes('14'))r[6]='E : DOM jsdom ; I : code ; navigateur non revalidé';
  }
  if(/\bU\b|captures|navigateur|UI-VIEWS/.test(old)&&!qa.length&&/E/.test(r[6])){
    if(/\b[SDLHP]\b/.test(r[8])){r[6]='E : serveur/handlers seulement ; UI NOT TESTED';r[8]=r[8].replace(/U[^;]+;?/g,'').replace(/captures[^;]+;?/g,'');}
    else set(r,r[5],'Non réexécuté au navigateur','BLOCKED','Accès du navigateur intégré refusé par sa politique ; preuves UI du premier audit historiques seulement');
  }
  if(feature==='Historique de modifications')set(r,'Conserver avant/après, version et empreinte de session auteur','E : tests SQL et restauration ; I : interface','PASS','S/L : clinical_session_revisions conservées ; aucune interface de restauration/version proposée');
  if(feature==='Archivage')set(r,'Archivage complet de fiche absent ; suppression limitée aux fiches vides','I + E API','NOT APPLICABLE','QA-20 bloque la suppression de tout historique ; H RETAIN-01 ; pas de fonction de purge clinique');
  if(feature==='Confirmation et suppression complète UI')set(r,'Une seule requête ; ne retirer la fiche qu’après succès ; afficher les refus','I UI ; E API/SQL','PASS','QA-20 ; H RETAIN-01 ; S/L ; interaction navigateur NOT TESTED');
  if(feature==='CSRF mutations')set(r,r[5],'Pas de test navigateur cross-site','NOT TESTED','Le premier audit observait un Origin non rejeté avec cookie forcé ; aucun exploit SameSite démontré');
  if(feature==='Statuts réels')r[8]='H SCHED-02 : 25 transitions sur RDV sans séance réalisée ; S/L : déplacement d’une consultation documentée refusé';
  if(feature==='Recherche accents et longueur')r[8]='X SEARCH-01 : 1 résultat accentué, 0 sans accent, injection ciblée 0, chaîne longue sans erreur ; UI NOT TESTED';
  if(feature==='PDF'&&r[7]==='PASS')r[8]='pdf-inspection.json ; pdf-contact-sheet.png';
  if(feature==='Facture et prescription courtes')set(r,'Texte, accents et montants présents','E : HTML applicatif → PDF → extraction/rendu','PASS','pdf-inspection.json et pdf-contact-sheet.png ; 2 factures 1 page, prescription courte 1 page');
  if(feature==='Route publique fichier PDF')r[8]='X PUBLIC-01 : 307 sans suivre la redirection, aucun PDF exposé';
  if(feature==='Confidentialité des agrégats')r[5]='Agrégats absents avant déverrouillage ; factures individuelles restent accessibles à l’admin';
  if(feature==='Nouvelle soumission formulaire')r[3]='POST invoices avec clé stable obligatoire';
  if(feature==='Historique de modifications'){r[2]='Dossier ; stockage serveur';r[3]='POST/PATCH/DELETE séances';r[4]='patient_sessions, clinical_session_revisions';}
  if(feature==='Occupation horaires par défaut')r[8]='M : oracle minute par minute de la fixture courante ; pas toutes configurations';
  if(feature==='Statuts, montants bruts, volumes')r[8]='M : 20/20 ; totaux en centimes ; détails dans dashboard-reaudit.md';
  if(feature==='Pôles, timeline, heatmap'){r[7]='PASS';r[8]='M : toutes les sommes vérifiées concordent ; chaque sous-groupe non recalculé';}
  if(feature==='Healthcheck DB')set(r,r[5],'E HTTP local','PASS','X PUBLIC-01 : 200 ; pas de données de patient exposées');
  if(feature==='Export backup/restauration CLI')set(r,'Backup conserve les nouveaux champs/révisions ; restauration locale','E suites sur fixtures ; exploitation non testée','PASS','S/L : test-patient-integrity, test-audit-remediation, test-scheduling ; S : test-reset ; restauration production NOT TESTED');
  if(feature==='Chargement et navigation perçus')r[8]='http-performance.json mesure HTTP chaud uniquement ; FCP/LCP navigateur NOT TESTED';
  if(feature==='Réservation manuelle desktop') {r[6]='E HTTP ; UI NOT TESTED';r[7]='PASS';r[8]='H DATA-01, SCHED-01 ; ancienne preuve navigateur non réutilisée';}
}
for(const r of rows)r[8]=r[8].replace(/D (?:lignes )?[0-9][0-9, /–—-]*/g,'D (contrôles nommés dans dashboard.log) ').replace(/;\s*$/,'').trim();
const text=['# Matrice fonctionnelle de revalidation — 7–8 octobre 2026','',
  'Cette matrice reprend les fonctionnalités du premier audit. PASS porte uniquement sur la méthode et le scénario cités. Les actions navigateur n’ont pas été rejouées ; leur validation serveur ne prouve pas leur comportement visuel. Le [registre des 489 contrôles](ui-controls.md) marque chaque exécution individuelle exhaustive NOT TESTED. Les corrections sont détaillées dans le [nouveau rapport](dashboard-reaudit.md).','',
  'E = exécuté ; I = inspection. H = [HTTP production local](http-results.json) ; X = [compléments HTTP](extra-results.json) ; S = [suite SQLite](suite.log) ; L = [suite libSQL locale](libsql.log) ; D = [dashboard](dashboard.log) ; M = [oracle SQL](metrics-verification.json) ; P = [performance](performance.json). Les numéros de lignes du premier audit ne sont pas utilisés comme preuve actuelle.','',
  '| Module | Fonctionnalité | Route/UI | API/action | Tables concernées | Règle métier | Méthode de vérification | Résultat | Preuve |',
  '|---|---|---|---|---|---|---|---|---|',...rows.map(r=>'| '+r.join(' | ')+' |')];
fs.writeFileSync(path.join(root,'reaudit/feature-matrix.md'),text.join('\n')+'\n');console.log({rows:rows.length});
