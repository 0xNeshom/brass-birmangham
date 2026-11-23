import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    // Stageshow is vendored source; lint the app code without rewriting the kit.
    'src/features/design-preview/stageshow-kit/**',
  ]),
]);
