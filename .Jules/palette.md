## 2023-10-27 - Accessible Icon Buttons in Floating Components
**Learning:** Icon-only close buttons in dismissable overlays and banners (like `PaymentRecoveryBanner.tsx`) often lack proper `aria-label`s and `type="button"` attributes. This makes them inaccessible to screen readers and poses a risk of unintended form submissions.
**Action:** Always verify that interactive icon elements inside custom UI components, especially floating ones, include a descriptive `aria-label` and an explicit `type="button"` attribute.
