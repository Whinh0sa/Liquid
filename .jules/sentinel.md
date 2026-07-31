## 2026-07-06 - [Express Error Handling Leak]
**Vulnerability:** Lack of global error handler in Express allows unhandled errors to expose stack traces, and lack of payload size limit exposes the application to DoS attacks.
**Learning:** Express 5 handles unhandled promise rejections natively, but without a custom error handler, it can still leak stack traces or internal errors to the client by default.
**Prevention:** Always implement a global error handler at the end of the Express middleware chain to log errors securely and return generic, safe JSON responses. Set payload limits on `express.json()` and `express.urlencoded()` to prevent large payload DoS.

## 2025-02-27 - Security Hardening of API Server
**Vulnerability:** The application lacked default HTTP security headers.
**Learning:** Using a simple middleware to set essential HTTP security headers offers an immediate defense-in-depth benefit without external dependencies.
**Prevention:** Introduce basic security headers directly or via a library like helmet at the project's inception.


## 2025-02-27 - [IDOR in Nested Resources with Drizzle ORM]
**Vulnerability:** In nested API routes (e.g., `/portfolio/:id/alerts/:alertId`), checking ownership of the parent resource (`:id`) is not enough. If the database update/delete query only filters by the child ID (`alertId`), an attacker could modify or delete children belonging to other parents by providing a valid parent ID they own and another user's child ID.
**Learning:** This is a common IDOR pattern when building nested REST APIs with an ORM like Drizzle. The child's foreign key must be explicitly matched against the parent ID provided in the URL to guarantee the child belongs to that parent.
**Prevention:** Always scope database update or delete queries for nested resources to include both the child resource's primary key and its foreign key to the parent (e.g., `where(and(eq(child.id, id), eq(child.parentId, parentId)))`).
