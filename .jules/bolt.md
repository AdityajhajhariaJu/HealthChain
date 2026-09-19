## 2024-10-18 - Exotic Components and TypeScript
**Learning:** In React 18+ with TypeScript, `React.memo()` returns a `NamedExoticComponent`. If you try to assign this to a variable typed as `React.FC<Props>`, TypeScript will throw a compilation error because exotic components are objects (using `$$typeof: Symbol(react.memo)`), not callable functions.
**Action:** When wrapping a component with `React.memo`, either remove the explicit type annotation and let TypeScript infer it, or type it correctly as `React.memo<Props>((...)`.
