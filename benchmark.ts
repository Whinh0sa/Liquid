const DEMO_ASSETS = Array.from({ length: 50 }, (_, i) => ({ model: `Asset ${i}` }));
const user = { id: 1 };

const db = {
  insert: () => ({
    values: () => ({
      onConflictDoNothing: () => ({
        returning: async () => {
          await new Promise(resolve => setTimeout(resolve, 10)); // simulate DB latency
          return [{ id: 1, model: 'a' }];
        }
      })
    })
  })
};

const schema = { assets: { id: 'id', model: 'model' } };

async function runSerial() {
  const start = performance.now();
  for (const asset of DEMO_ASSETS) {
    const [inserted] = await db
      .insert(schema.assets)
      .values({ ...asset, userId: user.id } as any)
      .onConflictDoNothing()
      .returning({ id: schema.assets.id, model: schema.assets.model });
  }
  return performance.now() - start;
}

async function runConcurrent() {
  const start = performance.now();
  await Promise.all(
    DEMO_ASSETS.map(async (asset) => {
      const [inserted] = await db
        .insert(schema.assets)
        .values({ ...asset, userId: user.id } as any)
        .onConflictDoNothing()
        .returning({ id: schema.assets.id, model: schema.assets.model });
    })
  );
  return performance.now() - start;
}

async function main() {
  console.log('Serial:', await runSerial());
  console.log('Concurrent:', await runConcurrent());
}

main();
