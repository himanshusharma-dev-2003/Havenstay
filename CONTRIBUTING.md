# Contributing to HavenStay

Thank you for your interest in contributing! This guide will help you get up and running quickly.

---

## Getting Started

1. **Fork** this repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/havenstay.git
   cd havenstay
   ```
3. **Install dependencies**:
   ```bash
   npm run install:all
   ```
4. **Configure environment variables**:
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env — fill in MONGO_URI and JWT secrets
   ```
5. **Seed the database** (optional but recommended):
   ```bash
   npm run seed
   ```
6. **Start the development servers**:
   ```bash
   npm run dev
   ```

---

## Branch Naming

| Type          | Pattern                  | Example                        |
|---------------|--------------------------|--------------------------------|
| Feature       | `feat/<short-description>` | `feat/redis-caching`          |
| Bug fix       | `fix/<short-description>`  | `fix/double-booking-race`     |
| Refactor      | `refactor/<description>`   | `refactor/extract-date-utils` |
| Documentation | `docs/<description>`       | `docs/api-reference`          |
| Chore         | `chore/<description>`      | `chore/update-dependencies`   |

---

## Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(scope): <short description>

[optional body]

[optional footer]
```

**Examples:**
```
feat(bookings): add cancellation reason field
fix(auth): prevent timing attack in password comparison
docs(readme): update docker setup instructions
chore(deps): bump mongoose to 8.1.0
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

---

## Code Style

- **Quotes**: single quotes (`'`) throughout the codebase
- **Indentation**: 2 spaces
- **Semicolons**: none (ASI style)
- **Controller functions**: document with JSDoc (`@param`, `@returns`, `@throws`)
- **Constants**: use named exports from `server/constants/index.js` — no magic numbers

---

## Running Tests

```bash
# Server unit + integration tests (uses in-memory MongoDB)
cd server && npm test

# With coverage
cd server && npm test -- --coverage
```

All tests must pass before submitting a PR.

---

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a PR against `main` in this repository.
3. Fill in the PR template completely.
4. Ensure the CI checks pass (tests + client build).
5. Await review — we aim to respond within 2 business days.

---

## Security Issues

Please **do not** open a public GitHub issue for security vulnerabilities.  
Instead, email directly at the address in the repository description.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
