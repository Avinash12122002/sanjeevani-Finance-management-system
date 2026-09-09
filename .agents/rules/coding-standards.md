# Sanjeevani Coding Standards

## 1. Write CONCISE Code — Think Like a Human Developer

- **SHORT over LONG**: Write the shortest correct solution. No unnecessary abstractions, wrappers, or over-engineering.
- **No boilerplate bloat**: Don't add code "just in case". If it's not needed NOW, don't write it.
- **DRY strictly**: Before writing ANY new function/utility, check if an existing one does the same thing. Never duplicate logic.
- **Direct approach**: Use built-in language features, lodash-style chaining, and ternaries where they improve readability over verbose if-else blocks.
- **Max function length**: 40 lines. If longer, refactor.
- **Max file length**: 200 lines. If longer, split.

## 2. Think Like the User — Understand Intent

- Before writing code, ask: "What does the user ACTUALLY want?" — not just what they literally said.
- If the request is ambiguous, ask ONE clarifying question instead of guessing wrong.
- Consider edge cases: What happens with empty data? Null values? Network failures? Invalid inputs?
- Always handle error states — never leave a catch block empty or with just `console.log`.

## 3. Bug Prevention Rules

- **Always use `===`**, never `==`.
- **Always use `const`** unless reassignment is truly needed (then `let`, never `var`).
- **Never ignore TypeScript errors** — fix them properly, don't use `as any` or `@ts-ignore`.
- **Validate all inputs** at API boundaries using class-validator decorators.
- **Check for null/undefined** before accessing nested properties. Use optional chaining `?.` and nullish coalescing `??`.
- **Return early** from functions to avoid deep nesting.

## 4. Logic Error Prevention

- **Name things clearly**: `isActive`, `hasPermission`, `totalAmount` — not `flag`, `data`, `temp`.
- **One function = one job**: If a function does two things, split it.
- **Avoid magic numbers**: Use named constants (`const MAX_RETRIES = 3`, not `3`).
- **Financial calculations MUST use Decimal.js** — never plain JavaScript arithmetic for money.
- **Array operations**: Prefer `.map()`, `.filter()`, `.reduce()` over manual loops.
- **Always handle async errors**: Every `await` should be in try-catch or have `.catch()`.

## 5. Code Optimization

- **Use early returns** to reduce nesting:
  ```typescript
  // ❌ BAD
  if (user) {
    if (user.isActive) {
      // 20 lines of code
    }
  }
  
  // ✅ GOOD
  if (!user || !user.isActive) return;
  // 20 lines of code
  ```
- **Destructure** objects and arrays.
- **Template literals** over string concatenation.
- **Object shorthand**: `{ name, age }` not `{ name: name, age: age }`.
- **Optional chaining**: `user?.address?.city` not `user && user.address && user.address.city`.

## 6. API-Specific (NestJS)

- Use proper HTTP status codes (201 for creation, 404 for not found, etc.)
- Always validate DTOs with class-validator
- Keep controllers thin — business logic goes in services
- Use proper TypeScript return types on all service methods

## 7. Frontend-Specific (Next.js/React)

- Prefer server components unless client interactivity is needed
- Memoize expensive computations with `useMemo`
- Avoid re-renders: don't create objects/functions inside JSX
- Extract reusable components — don't copy-paste JSX blocks
- Keep component files focused: one main component per file
