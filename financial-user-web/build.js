import { build } from 'vite';

try {
  await build({ configFile: './vite.config.js' });
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
