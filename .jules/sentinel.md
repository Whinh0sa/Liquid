## 2025-02-27 - Security Hardening of API Server
**Vulnerability:** The application lacked default HTTP security headers.
**Learning:** Using a simple middleware to set essential HTTP security headers offers an immediate defense-in-depth benefit without external dependencies.
**Prevention:** Introduce basic security headers directly or via a library like helmet at the project's inception.