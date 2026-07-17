## 2025-05-18 - Nested Resource IDOR with Drizzle ORM
**Vulnerability:** A nested REST endpoint (`/api/portfolio/:id/alerts/:alertId`) checked that the parent asset (`:id`) belonged to the current user, but the subsequent database update/delete query only filtered by the child's primary key (`alertId`). This created an Insecure Direct Object Reference (IDOR), where a user could pass a valid asset ID they owned in the URL path, but provide an `alertId` belonging to another user, bypassing the authorization check.
**Learning:** Checking parent authorization at the route level is insufficient if the database query doesn't enforce the parent-child relationship.
**Prevention:** To prevent Insecure Direct Object Reference (IDOR) vulnerabilities on nested resources (especially using Drizzle ORM), always scope database update or delete queries to include both the child resource's ID and the parent's foreign key (e.g., `where(and(eq(child.id, id), eq(child.parentId, parentId)))`).

## 2026-07-06 - [Express Error Handling Leak]
**Vulnerability:** Lack of global error handler in Express allows unhandled errors to expose stack traces, and lack of payload size limit exposes the application to DoS attacks.
**Learning:** Express 5 handles unhandled promise rejections natively, but without a custom error handler, it can still leak stack traces or internal errors to the client by default.
**Prevention:** Always implement a global error handler at the end of the Express middleware chain to log errors securely and return generic, safe JSON responses. Set payload limits on `express.json()` and `express.urlencoded()` to prevent large payload DoS.

## 2025-02-27 - Security Hardening of API Server
**Vulnerability:** The application lacked default HTTP security headers.
**Learning:** Using a simple middleware to set essential HTTP security headers offers an immediate defense-in-depth benefit without external dependencies.
**Prevention:** Introduce basic security headers directly or via a library like helmet at the project's inception.

