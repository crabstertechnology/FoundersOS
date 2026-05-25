import fs from 'fs';
import { execSync } from 'child_process';

const PROJECT_ID = 'studio-5418824271-71a21';
const RULES_CONTENT = fs.readFileSync('./firestore.rules', 'utf8');

async function deployRules() {
  let token;
  try {
    token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  } catch {
    console.error('❌ gcloud not found or not logged in.');
    console.log('\nDeploy manually at:');
    console.log(`https://console.firebase.google.com/project/${PROJECT_ID}/firestore/rules`);
    return;
  }

  const body = JSON.stringify({
    source: { files: [{ name: 'firestore.rules', content: RULES_CONTENT }] }
  });

  // Step 1: Create ruleset
  const rulesetRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body }
  );
  const ruleset = await rulesetRes.json();
  if (!rulesetRes.ok) { console.error('❌ Failed to create ruleset:', JSON.stringify(ruleset)); return; }
  console.log('✅ Created ruleset:', ruleset.name);

  const releaseBody = JSON.stringify({
    release: { name: `projects/${PROJECT_ID}/releases/cloud.firestore`, rulesetName: ruleset.name }
  });

  // Step 2: Try PATCH to update existing release
  let releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: releaseBody }
  );

  if (!releaseRes.ok) {
    // Fall back to POST to create release
    releaseRes = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
      { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: releaseBody }
    );
  }

  const releaseResult = await releaseRes.json();
  if (!releaseRes.ok) { console.error('❌ Failed to deploy release:', JSON.stringify(releaseResult)); return; }
  console.log('✅ Rules deployed successfully!', releaseResult.release?.name || releaseResult.name);
}

deployRules().catch(console.error);
