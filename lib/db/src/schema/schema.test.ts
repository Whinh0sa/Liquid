import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './index';
import { eq } from 'drizzle-orm';

describe('Database Schema Relations', () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    // Spin up an in-memory test database instance
    client = new PGlite();
    db = drizzle(client, { schema });

    // In a real scenario we'd run migrations or drizzle-kit push
    // For now we'll execute DDL statements manually for the test
    await client.exec(`
      CREATE TYPE asset_category AS ENUM ('TECH', 'FASHION');
      CREATE TYPE asset_status AS ENUM ('HOLD', 'ACTION_REQUIRED', 'LIQUIDATE', 'IN_TRANSIT');

      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        last_seen_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category asset_category NOT NULL DEFAULT 'TECH',
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        storage_capacity TEXT,
        purchase_price INTEGER NOT NULL,
        current_estimated_value INTEGER NOT NULL,
        projected_drop INTEGER NOT NULL DEFAULT 0,
        cliff_date TIMESTAMP WITH TIME ZONE NOT NULL,
        cliff_reason TEXT,
        status asset_status NOT NULL DEFAULT 'HOLD',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE price_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        target_price INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        triggered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);
  });

  afterAll(async () => {
    await client.close();
  });

  it('should insert and retrieve a user with related assets and price alerts', async () => {
    // 1. Create a user
    const [user] = await db.insert(schema.users).values({
      clerkUserId: 'test_clerk_id',
      email: 'test@example.com',
      displayName: 'Test User'
    }).returning();

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();

    // 2. Create an asset for the user
    const [asset] = await db.insert(schema.assets).values({
      userId: user.id,
      category: 'TECH',
      make: 'Apple',
      model: 'iPhone 14 Pro',
      purchasePrice: 100000,
      currentEstimatedValue: 80000,
      cliffDate: new Date('2024-09-10'),
      status: 'HOLD'
    }).returning();

    expect(asset).toBeDefined();
    expect(asset.id).toBeDefined();
    expect(asset.userId).toBe(user.id);

    // 3. Create a price alert for the asset
    const [alert] = await db.insert(schema.priceAlerts).values({
      assetId: asset.id,
      targetPrice: 75000
    }).returning();

    expect(alert).toBeDefined();
    expect(alert.id).toBeDefined();
    expect(alert.assetId).toBe(asset.id);

    // 4. Query using relations
    const userWithAssets = await db.query.users.findFirst({
      where: eq(schema.users.id, user.id),
      with: {
        assets: {
          with: {
            priceAlerts: true
          }
        }
      }
    });

    expect(userWithAssets).toBeDefined();
    expect(userWithAssets?.assets.length).toBe(1);
    expect(userWithAssets?.assets[0].id).toBe(asset.id);
    expect(userWithAssets?.assets[0].priceAlerts.length).toBe(1);
    expect(userWithAssets?.assets[0].priceAlerts[0].id).toBe(alert.id);
  });

  it('should enforce foreign key constraint (delete cascade)', async () => {
    // Create a new user, asset, and price alert
    const [user] = await db.insert(schema.users).values({
      clerkUserId: 'test_cascade_user',
      email: 'cascade@example.com',
    }).returning();

    const [asset] = await db.insert(schema.assets).values({
      userId: user.id,
      make: 'Sony',
      model: 'PS5',
      purchasePrice: 50000,
      currentEstimatedValue: 40000,
      cliffDate: new Date(),
    }).returning();

    const [alert] = await db.insert(schema.priceAlerts).values({
      assetId: asset.id,
      targetPrice: 30000,
    }).returning();

    // Verify they exist
    let assetCount = await db.select().from(schema.assets).where(eq(schema.assets.id, asset.id));
    let alertCount = await db.select().from(schema.priceAlerts).where(eq(schema.priceAlerts.id, alert.id));

    expect(assetCount.length).toBe(1);
    expect(alertCount.length).toBe(1);

    // Delete the user
    await db.delete(schema.users).where(eq(schema.users.id, user.id));

    // Verify they were cascaded
    assetCount = await db.select().from(schema.assets).where(eq(schema.assets.id, asset.id));
    alertCount = await db.select().from(schema.priceAlerts).where(eq(schema.priceAlerts.id, alert.id));

    expect(assetCount.length).toBe(0);
    expect(alertCount.length).toBe(0);
  });
});
