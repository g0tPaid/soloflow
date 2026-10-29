import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('server PDF bundling', () => {
  it('does not compile @react-pdf/renderer into the Next.js server', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(path.join(here, '../../../next.config.ts'), 'utf8');
    const transpile = source.match(/transpilePackages:\s*\[([^\]]*)\]/)?.[1] ?? '';
    const external = source.match(/serverExternalPackages:\s*\[([^\]]*)\]/)?.[1] ?? '';

    expect(transpile).not.toContain('@react-pdf/renderer');
    expect(external).toContain('@react-pdf/renderer');
  });
});
