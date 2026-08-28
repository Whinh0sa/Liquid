## 2026-07-06 - [Express Error Handling Leak]
**Vulnerability:** Lack of global error handler in Express allows unhandled errors to expose stack traces, and lack of payload size limit exposes the application to DoS attacks.
**Learning:** Express 5 handles unhandled promise rejections natively, but without a custom error handler, it can still leak stack traces or internal errors to the client by default.
**Prevention:** Always implement a global error handler at the end of the Express middleware chain to log errors securely and return generic, safe JSON responses. Set payload limits on `express.json()` and `express.urlencoded()` to prevent large payload DoS.

## 2025-02-27 - Security Hardening of API Server
**Vulnerability:** The application lacked default HTTP security headers.
**Learning:** Using a simple middleware to set essential HTTP security headers offers an immediate defense-in-depth benefit without external dependencies.
**Prevention:** Introduce basic security headers directly or via a library like helmet at the project's inception.

## 2023-08-28 - [Nested Resource IDOR]
**Vulnerability:** IDOR vulnerability in nested resource endpoints (`/portfolio/:id/alerts/:alertId`). Although the endpoints verified user ownership of the parent resource (`asset`), the database queries to update/delete the nested resource (`alert`) did not scope the query to ensure the nested resource actually belonged to the specified parent resource. An attacker could modify or delete alerts belonging to other users by providing their own `assetId` and another user's `alertId`.
**Learning:** Checking parent ownership is insufficient if the database query acting on the child resource does not enforce the parent-child relationship.
**Prevention:** When updating or deleting nested resources, always scope the database query to include both the child resource's ID and the parent resource's ID (e.g., `where(and(eq(child.id, id), eq(child.parentId, parentId)))`).
