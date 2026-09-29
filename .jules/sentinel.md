## 2026-07-06 - [Express Error Handling Leak]
**Vulnerability:** Lack of global error handler in Express allows unhandled errors to expose stack traces, and lack of payload size limit exposes the application to DoS attacks.
**Learning:** Express 5 handles unhandled promise rejections natively, but without a custom error handler, it can still leak stack traces or internal errors to the client by default.
**Prevention:** Always implement a global error handler at the end of the Express middleware chain to log errors securely and return generic, safe JSON responses. Set payload limits on `express.json()` and `express.urlencoded()` to prevent large payload DoS.

## 2025-02-27 - Security Hardening of API Server
**Vulnerability:** The application lacked default HTTP security headers.
**Learning:** Using a simple middleware to set essential HTTP security headers offers an immediate defense-in-depth benefit without external dependencies.
**Prevention:** Introduce basic security headers directly or via a library like helmet at the project's inception.


### React Style Tag XSS
- **Vulnerability**: React strings rendered inside `<style>` or `<script>` tags, or passed via `dangerouslySetInnerHTML`, are not HTML escaped. An attacker can use inputs containing `</style><script>alert(1)</script>` to terminate the style block and inject arbitrary scripts.
- **Fix Pattern**: When dynamically generating CSS in React components (e.g. for charts or themes), aggressively sanitize the string before assigning to `__html` or children. For purely CSS content, stripping HTML tags or simply stripping `<` and `>` characters entirely (e.g., `.replaceAll(/</g, "")`) is a safe and effective way to prevent HTML breakout.
