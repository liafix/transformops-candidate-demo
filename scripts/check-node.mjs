const [major, minor] = process.versions.node.split(".").map(Number);

if (major !== 22 || minor < 12) {
  console.error(
    `TransformOps requires Node.js 22.12+ (22.x). Current runtime: ${process.version}.`,
  );
  console.error("Install/use Node.js 22 LTS, then run npm install again.");
  process.exit(1);
}

console.log(`Node runtime OK: ${process.version}`);
