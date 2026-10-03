const [majorText, minorText, patchText] = process.versions.node.split(".");
const major = Number(majorText);
const minor = Number(minorText);
const patch = Number(patchText);

if (major !== 24 || !Number.isInteger(minor) || !Number.isInteger(patch)) {
  console.error(`SIGN TRAINER requires Node.js 24.x. Current runtime: ${process.version}`);
  console.error("Switch to Node 24 before install, check, dev, migration, or deploy. .nvmrc / .node-version are included.");
  process.exit(1);
}

console.log(`Runtime check passed: Node.js ${process.versions.node} (supported major: 24).`);
