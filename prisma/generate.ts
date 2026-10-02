import { getGenerators } from '@prisma/internals';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Pinned Prisma 6 generator API avoids the CLI's unused native schema-engine bootstrap.
// engineType=client uses the bundled WASM compiler and the SQLite driver adapter.
async function main() {
  const generators = await getGenerators({
    schemaPath: resolve('prisma/schema.prisma'),
    skipDownload: true,
    registry: {
      'prisma-client-js': {
        type: 'rpc',
        generatorPath: require.resolve('@prisma/client/generator-build/index.js'),
        isNode: true,
      },
    },
  });
  try {
    for (const generator of generators) await generator.generate();
    console.log('Generated engine-free Prisma client.');
  } finally {
    for (const generator of generators) generator.stop();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
