# Testing — Babylon App (Angular)

## Philosophy

- **Component tests**: Test behavior, not implementation. Test what the user sees.
- **Service tests**: Test HTTP calls, state mutations, and error handling.
- **No business logic to test in the frontend** — all calculation is owned by the API.

---

## Framework

Angular testing utilities (TestBed, ComponentFixture) with Jasmine/Karma or Jest depending on configuration.

---

## Component Testing Guidelines

### What to Test
- Component renders expected DOM given inputs
- Output events emitted correctly on user interaction
- Correct HTTP status reflected in template (loading, error, success states)
- Error state component displayed on service failure

### What NOT to Test
- Business logic (zero business logic in components)
- Internal implementation details
- Angular framework behavior

---

## Service Testing Guidelines

### What to Test
- HTTP calls made with correct URL, method, and body
- `ApiResponse<T>` success path updates state correctly
- `ApiErrorResponse` error path exposed correctly
- Signal state updates reflect service calls

### Pattern
Use `HttpClientTestingModule` and `HttpTestingController` to mock HTTP.

---

## Smart/Dumb Component Testing Split

- **Dumb components**: Test with direct `@Input()` bindings — no service mocks needed
- **Smart components**: Mock services, test that correct data flows to child components

---

## Anti-Patterns

- Testing with `any` types in test setups
- Testing that Angular's DI works (trust the framework)
- Hardcoding API responses without typed interfaces
