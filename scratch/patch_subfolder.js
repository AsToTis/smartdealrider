const fs = require('fs');
const path = require('path');

// 1. Patch vite.config.js
const viteConfigPath = 'C:\\smartdealadmin\\vite.config.js';
let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');

// Replace standard export default defineConfig({ ... })
if (!viteConfig.includes("base: command === 'build' ? '/244/' : '/'")) {
  viteConfig = viteConfig.replace(
    /export default defineConfig\(\{/,
    "export default defineConfig(({ command }) => ({\n  base: command === 'build' ? '/244/' : '/',"
  );
  // change the closing } to }) if we changed to arrow function
  viteConfig = viteConfig.replace(/\}\)\s*$/, '}))$');
  // Actually, string replace might be tricky. Let's just rewrite the file since it's simple.
}

const newViteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/244/' : '/',
}))`;

fs.writeFileSync(viteConfigPath, newViteConfig);

// 2. Patch App.jsx
const appJsxPath = 'C:\\smartdealadmin\\src\\App.jsx';
let appJsx = fs.readFileSync(appJsxPath, 'utf8');
if (!appJsx.includes('basename=')) {
  appJsx = appJsx.replace(
    /<BrowserRouter>/,
    `<BrowserRouter basename={import.meta.env.DEV ? '/' : '/244/'}>`
  );
  fs.writeFileSync(appJsxPath, appJsx);
}

console.log('Fixed Base URL and BrowserRouter for subfolder /244/');
