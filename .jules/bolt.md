## 2026-09-24 - React 18+ TypeScript Memoization of Components
**Learning:** When wrapping a component with `React.memo` in React 18+ with TypeScript, using `const Component: React.FC<Props> = React.memo(...)` can cause type compilation errors.
**Action:** Avoid type compilation errors by using `const Component = React.memo<Props>((...) ` instead of `const Component: React.FC<Props> = React.memo(...)`.
