# Backend Architecture & Design Philosophy

## 1. Overview
The backend for **MISTER CODERZ Vault** follows a modular, scalable architecture using the **Controller-Service** pattern. This structure ensures a clean separation of concerns, making the codebase maintainable, testable, and easily extendable for future phases (like integrating Telegram, PostgreSQL, etc.).

## 2. Directory Structure

```text
server/
├── config/       # Configuration setup (DB connections, environment loading)
├── constants/    # Application-wide constants (status codes, strings, magic numbers)
├── controllers/  # Request handlers (extract data, call services, send response)
├── middleware/   # Express middleware (auth, logging, error handling)
├── routes/       # Express route definitions
├── services/     # Core business logic (heavy lifting, external API calls)
├── types/        # JSDoc/TypeScript types for data models
└── utils/        # Generic helper functions (date parsing, hashing)
```

## 3. Request Flow Diagram

```text
+----------+      +-----------+      +--------------+      +----------+
|          |      |           |      |              |      |          |
|  Client  +----->+  Routes   +----->+ Controllers  +----->+ Services |
|          |      |           |      |              |      |          |
+----------+      +-----+-----+      +------+-------+      +----+-----+
      ^                 |                   |                   |
      |                 |                   |                   v
      |           +-----v-----+             |            +------+-------+
      |           |           |             |            |              |
      +-----------+ Middleware|             |            | DB / External|
     (Response)   |           |             |            |   (Future)   |
                  +-----------+             |            +--------------+
                                            |
                                            |
                                            |
                                       (Response)
```

**Flow Description:**
1. **Client** makes an HTTP request to the server.
2. **Routes** determine which controller method handles the request.
3. **Middleware** can intercept the request before it reaches the controller (e.g., for authentication, logging, validation).
4. **Controllers** extract parameters/body, validate input, and delegate the business logic to a specific Service.
5. **Services** execute the core business rules, interact with databases or external APIs (e.g., Telegram), and return the result to the Controller.
6. **Controllers** format the final HTTP response (JSON, status codes) and send it back to the Client.

## 4. Coding Conventions

- **Separation of Concerns**: Controllers MUST NOT contain complex business logic. Services MUST NOT handle HTTP request/response objects directly.
- **Error Handling**: Use centralized middleware for error handling. Controllers should catch errors and pass them to `next(err)`.
- **Statelessness**: The API should remain stateless. No session state should be stored in the server memory.
- **Modularity**: Code should be organized into small, reusable functions located in the `utils/` or `services/` folders.
- **Naming Conventions**: Use `camelCase` for variables and functions. Use `PascalCase` for classes and types. Use `UPPER_SNAKE_CASE` for constants.
