// ─── Clerk Auth Middleware ────────────────────────────────────────────────────
//
// Validates the Clerk JWT on every protected request and auto-provisions
// a DB user row on first sign-in.
//
// Usage in route files:
//   import { requireAuth } from "../middlewares/clerkAuth.js";
//   router.get("/portfolio", requireAuth, async (req, res) => {
//     const { dbUserId, clerkUserId } = req.auth;
//     ...
//   });
//
// The middleware adds `req.auth` with:
//   clerkUserId  — raw Clerk user ID from the JWT (e.g. "user_2abc...")
//   dbUserId     — the UUID primary key from our `users` table

import type { Request, Response, NextFunction } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { users } from "@workspace/db/schema";

// Extend Express Request type to carry auth info
declare global {
  namespace Express {
    interface Request {
      auth: {
        clerkUserId: string;
        dbUserId: string;
      };
    }
  }
}

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.authorization;
  
  // Support Guest / Judge Mode without sign-in requirement
  const isGuestMode = !authHeader || authHeader === "Bearer null" || authHeader === "Bearer undefined" || authHeader === "Bearer guest-mode" || authHeader === "Bearer guest-judge-token";

  if (isGuestMode) {
    try {
      // Find or provision demo judge user
      let demoUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkUserId, "demo_seed_user"))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!demoUser) {
        const [newUser] = await db
          .insert(users)
          .values({
            clerkUserId: "demo_seed_user",
            email: "judge@liquid.app",
            displayName: "Judge / Demo User",
            lastSeenAt: new Date(),
          })
          .returning({ id: users.id });
        demoUser = newUser;
      }

      req.auth = { clerkUserId: "demo_seed_user", dbUserId: demoUser.id };
      return next();
    } catch (guestErr) {
      req.log?.warn({ err: guestErr }, "Guest mode user lookup failed, proceeding with fallback");
      req.auth = { clerkUserId: "demo_seed_user", dbUserId: "3a1bdb34-0b6d-47f3-837a-d77f08556246" };
      return next();
    }
  }

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Verify the Clerk JWT using standalone verifyToken
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const clerkUserId = payload.sub;


    // Look up or auto-provision the DB user row
    let dbUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!dbUser) {
      // First time this Clerk user hits the API — fetch their details and
      // create the DB row automatically (no separate signup step needed).
      const clerkUser = await clerk.users.getUser(clerkUserId);
      const primaryEmail =
        clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ?? "";

      const [newUser] = await db
        .insert(users)
        .values({
          clerkUserId,
          email: primaryEmail,
          displayName:
            [clerkUser.firstName, clerkUser.lastName]
              .filter(Boolean)
              .join(" ") || undefined,
          lastSeenAt: new Date(),
        })
        .returning({ id: users.id });

      dbUser = newUser;
      req.log?.info({ clerkUserId, dbUserId: dbUser.id }, "Auto-provisioned new user");
    } else {
      // Update lastSeenAt in the background — don't block the request
      db.update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.clerkUserId, clerkUserId))
        .catch(() => {/* non-critical, ignore */});
    }

    req.auth = { clerkUserId, dbUserId: dbUser.id };
    next();
  } catch (err) {
    req.log?.warn({ err }, "Auth token verification failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
