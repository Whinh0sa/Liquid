## 2026-07-06 - [Express Error Handling Leak]
**Vulnerability:** Lack of global error handler in Express allows unhandled errors to expose stack traces, and lack of payload size limit exposes the application to DoS attacks.
**Learning:** Express 5 handles unhandled promise rejections natively, but without a custom error handler, it can still leak stack traces or internal errors to the client by default.
**Prevention:** Always implement a global error handler at the end of the Express middleware chain to log errors securely and return generic, safe JSON responses. Set payload limits on `express.json()` and `express.urlencoded()` to prevent large payload DoS.

## 2025-02-27 - Security Hardening of API Server
**Vulnerability:** The application lacked default HTTP security headers.
**Learning:** Using a simple middleware to set essential HTTP security headers offers an immediate defense-in-depth benefit without external dependencies.
**Prevention:** Introduce basic security headers directly or via a library like helmet at the project's inception.

## 2025-02-27 - [IDOR in Nested Resources with Drizzle ORM]
**Vulnerability:** Insecure Direct Object Reference (IDOR) on the `PATCH /api/portfolio/:id/alerts/:alertId` and `DELETE` endpoints, where the `where` clause only filtered by the child `alertId`, completely ignoring the parent `assetId`.
**Learning:** Checking ownership of a parent resource (`requireAsset(id, userId)`) is insufficient if the subsequent query operates on a child resource without scoping the child query to that parent's foreign key.
**Prevention:** To prevent IDOR vulnerabilities on nested resources (especially using Drizzle ORM), always scope database update or delete queries to include both the child resource's ID and the parent's foreign key (e.g., `where(and(eq(child.id, id), eq(child.parentId, parentId)))`).
