import audit from './i18n-audit.cjs';

const result = audit.staticAudit();
console.log(`PT / EN / FR / ES: ${result.articles} complete articles; ${result.localizedRecords} localized records checked.`);
const issues = [...result.issues];
if (process.env.SERVICE_AUDIT_URL) {
  const response = await fetch(process.env.SERVICE_AUDIT_URL);
  if (!response.ok) throw new Error(`Catalogue unavailable: ${response.status}`);
  const { services } = await response.json();
  if (!Array.isArray(services)) throw new Error('Expected a public services array.');
  issues.push(...audit.catalogueAudit(services));
  console.log(`Administrator-managed catalogue: ${services.length} treatments checked.`);
} else {
  console.log('Runtime catalogue not checked. Set SERVICE_AUDIT_URL to an explicit /api/treatments endpoint to include it. Patient-authored records retain their original wording.');
}
for (const issue of issues) console.error(issue);
console.log(`${issues.length} localization issues.`);
if (issues.length) process.exitCode = 1;
