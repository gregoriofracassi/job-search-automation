// Automatically copies .env.example → .env for any app that is missing its .env file.
// Runs automatically before `pnpm dev` via the predev script.

const { existsSync, copyFileSync } = require('fs');
const { resolve } = require('path');

const root = resolve(__dirname, '..');

const envFiles = ['apps/backend/.env', 'apps/frontend/.env'];

for (const envFile of envFiles) {
  const dest = resolve(root, envFile);
  const src = resolve(root, `${envFile}.example`);

  if (!existsSync(dest)) {
    if (existsSync(src)) {
      copyFileSync(src, dest);
      console.log(`created ${envFile} from ${envFile}.example`);
    } else {
      console.warn(`warning: ${envFile}.example not found, skipping`);
    }
  }
}
