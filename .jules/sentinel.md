## 2026-07-06 - [Express Error Handling Leak]
**Vulnerability:** Lack of global error handler in Express allows unhandled errors to expose stack traces, and lack of payload size limit exposes the application to DoS attacks.
**Learning:** Express 5 handles unhandled promise rejections natively, but without a custom error handler, it can still leak stack traces or internal errors to the client by default.
**Prevention:** Always implement a global error handler at the end of the Express middleware chain to log errors securely and return generic, safe JSON responses. Set payload limits on `express.json()` and `express.urlencoded()` to prevent large payload DoS.
