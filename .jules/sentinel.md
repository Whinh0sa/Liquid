## 2026-07-06 - [Express Error Handling Leak]
**Vulnerability:** Lack of global error handler in Express allows unhandled errors to expose stack traces, and lack of payload size limit exposes the application to DoS attacks.
**Learning:** Express 5 handles unhandled promise rejections natively, but without a custom error handler, it can still leak stack traces or internal errors to the client by default.
**Prevention:** Always implement a global error handler at the end of the Express middleware chain to log errors securely and return generic, safe JSON responses. Set payload limits on `express.json()` and `express.urlencoded()` to prevent large payload DoS.

## 2025-02-27 - Security Hardening of API Server
**Vulnerability:** The application lacked default HTTP security headers.
**Learning:** Using a simple middleware to set essential HTTP security headers offers an immediate defense-in-depth benefit without external dependencies.
**Prevention:** Introduce basic security headers directly or via a library like helmet at the project's inception.


## 2026-07-10 - [IDOR in Nested Resources]
**Vulnerability:** The PATCH and DELETE price alert endpoints verified ownership of the parent asset (`id`) but did not verify that the target alert (`alertId`) actually belonged to that asset. This allowed an Insecure Direct Object Reference (IDOR) where an attacker could modify or delete alerts belonging to other users.
**Learning:** When validating nested resource paths (e.g., `/assets/:id/alerts/:alertId`), it is not enough to just verify ownership of the parent resource. You must also ensure the child resource belongs to that parent resource within the query to prevent IDOR on the child resource.
**Prevention:** Always scope database update/delete queries for nested resources to include both the child's primary key (`id = alertId`) AND the parent's foreign key (`assetId = id`), rather than relying solely on a separate parent-ownership check.
