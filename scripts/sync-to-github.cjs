const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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
    maxBuffer: 100 * 1024 * 1024
  });
  return stdout ? JSON.parse(stdout) : {};
}

async function main() {
  console.log(`=== Synchronizing Full-HD maps & code to GitHub [${OWNER}/${REPO}] ===`);

  // 1. Get remote head
  const refRes = ghApi(`/repos/${OWNER}/${REPO}/git/refs/heads/main`);
  const parentCommitSha = refRes.object.sha;
  console.log('Current remote main SHA:', parentCommitSha);

  // 2. Get remote tree
  console.log('Fetching remote tree...');
  const remoteTreeRes = ghApi(`/repos/${OWNER}/${REPO}/git/trees/main?recursive=1`);
  const remoteMap = new Map();
  remoteTreeRes.tree.forEach(t => {
    if (t.type === 'blob') {
      remoteMap.set(t.path, t.sha);
    }
  });

  // 3. Get local git tracked files
  const lsOutput = execFileSync('git', ['ls-files', '-s'], { cwd: ROOT, encoding: 'utf8' });
  const lines = lsOutput.trim().split('\n').filter(Boolean);

  const treeItems = [];
  const toUpload = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);
    const mode = parts[0];
    const sha = parts[1];
    const filePath = parts.slice(3).join(' ');

    treeItems.push({
      path: filePath,
      mode: mode,
      type: 'blob',
      sha: sha
    });

    if (remoteMap.get(filePath) !== sha) {
      toUpload.push({ filePath, sha });
    }
  }

  console.log(`Total repository files: ${treeItems.length}`);
  console.log(`Files to upload: ${toUpload.length}`);

  // 4. Upload missing blobs
  for (let i = 0; i < toUpload.length; i++) {
    const item = toUpload[i];
    const absPath = path.join(ROOT, item.filePath);
    const stat = fs.statSync(absPath);
    const mb = (stat.size / (1024 * 1024)).toFixed(2);

    process.stdout.write(`[${i + 1}/${toUpload.length}] (${mb} MB) ${item.filePath}... `);

    // Check if blob already exists on GitHub
    let alreadyExists = false;
    try {
      const checkRes = ghApi(`/repos/${OWNER}/${REPO}/git/blobs/${item.sha}`);
      if (checkRes && checkRes.sha) {
        alreadyExists = true;
      }
    } catch (e) {
      alreadyExists = false;
    }

    if (alreadyExists) {
      console.log(`OK (Already on GitHub)`);
      continue;
    }

    const buf = fs.readFileSync(absPath);
    const blobRes = ghApi(`/repos/${OWNER}/${REPO}/git/blobs`, 'POST', {
      content: buf.toString('base64'),
      encoding: 'base64'
    });

    if (blobRes.sha === item.sha) {
      console.log(`OK`);
    } else {
      console.log(`Uploaded SHA mismatch! Expected ${item.sha}, got ${blobRes.sha}`);
      // update tree item with uploaded sha if any difference
      const found = treeItems.find(t => t.path === item.filePath);
      if (found) found.sha = blobRes.sha;
    }
  }

  // 5. Create new tree using base_tree
  console.log('Creating new git tree on GitHub with base_tree...');
  const parentCommitRes = ghApi(`/repos/${OWNER}/${REPO}/git/commits/${parentCommitSha}`);
  const baseTreeSha = parentCommitRes.tree.sha;

  const modifiedTreeEntries = toUpload.map(item => {
    const found = treeItems.find(t => t.path === item.filePath);
    return {
      path: item.filePath,
      mode: found ? found.mode : '100644',
      type: 'blob',
      sha: found ? found.sha : item.sha
    };
  });

  const newTreeRes = ghApi(`/repos/${OWNER}/${REPO}/git/trees`, 'POST', {
    base_tree: baseTreeSha,
    tree: modifiedTreeEntries
  });
  console.log('New tree SHA:', newTreeRes.sha);


  // 6. Create commit
  console.log('Creating commit...');
  const commitRes = ghApi(`/repos/${OWNER}/${REPO}/git/commits`, 'POST', {
    message: 'feat: pre-render all maps to Full-HD WebP across all servers and update maps manifest',
    tree: newTreeRes.sha,
    parents: [parentCommitSha]
  });
  console.log('New commit SHA:', commitRes.sha);

  // 7. Update branch ref
  console.log('Updating refs/heads/main...');
  ghApi(`/repos/${OWNER}/${REPO}/git/refs/heads/main`, 'PATCH', {
    sha: commitRes.sha,
    force: false
  });

  console.log(`\nSUCCESS! Updated main to ${commitRes.sha}`);
}

main().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
