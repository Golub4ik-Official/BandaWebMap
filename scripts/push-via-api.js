import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OWNER = 'Golub4ik-Official';
const REPO = 'BandaWebMap';
const ROOT = path.resolve(__dirname, '..');

function ghApi(endpoint, method = 'GET', body = null) {
  const args = ['api', endpoint, '--method', method];

  if (body) {
    args.push('--input', '-');
  }

  const input = body ? JSON.stringify(body) : undefined;
  const stdout = execFileSync('gh', args, {
    input: input,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });

  return stdout ? JSON.parse(stdout) : {};
}

function getAllFiles(dir, fileList = [], baseDir = ROOT) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (
      entry.name === '.git' || 
      entry.name === 'node_modules' || 
      entry.name === 'dist' || 
      entry.name.endsWith('.log')
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList, baseDir);
    } else {
      fileList.push({ fullPath, relPath });
    }
  }
  return fileList;
}

async function run() {
  console.log('--- Uploading BandaWebMap React/Vite App via gh API ---');
  const files = getAllFiles(ROOT);
  console.log(`Found ${files.length} files to upload.`);

  // 1. Create blobs for all files
  const treeItems = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const contentBuffer = fs.readFileSync(f.fullPath);
    const base64Content = contentBuffer.toString('base64');

    process.stdout.write(`Uploading [${i + 1}/${files.length}] ${f.relPath}... `);
    const blobRes = ghApi(`/repos/${OWNER}/${REPO}/git/blobs`, 'POST', {
      content: base64Content,
      encoding: 'base64'
    });

    console.log(`OK (${blobRes.sha.slice(0, 7)})`);

    treeItems.push({
      path: f.relPath,
      mode: '100644',
      type: 'blob',
      sha: blobRes.sha
    });
  }

  // 2. Create tree
  console.log('Creating Git tree...');
  const treeRes = ghApi(`/repos/${OWNER}/${REPO}/git/trees`, 'POST', {
    tree: treeItems
  });
  console.log('Tree SHA:', treeRes.sha);

  // 3. Get parent commit
  const refRes = ghApi(`/repos/${OWNER}/${REPO}/git/refs/heads/main`);
  const parentCommitSha = refRes.object.sha;
  console.log('Parent commit SHA:', parentCommitSha);

  // 4. Create commit
  console.log('Creating commit...');
  const commitRes = ghApi(`/repos/${OWNER}/${REPO}/git/commits`, 'POST', {
    message: 'refactor: redesign to minimal React+TS+Vite with progressive Full-HD maps',
    tree: treeRes.sha,
    parents: [parentCommitSha]
  });
  console.log('Commit SHA:', commitRes.sha);

  // 5. Update ref heads/main
  console.log('Updating refs/heads/main...');
  ghApi(`/repos/${OWNER}/${REPO}/git/refs/heads/main`, 'PATCH', {
    sha: commitRes.sha,
    force: true
  });
  console.log('refs/heads/main updated successfully!');

  console.log('\n=== COMPLETE ===');
  console.log(`Repository: https://github.com/${OWNER}/${REPO}`);
  console.log(`Pages: https://${OWNER.toLowerCase()}.github.io/${REPO}/`);
}

run().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
