export const STORE_PRODUCTS: Readonly<Record<'pro_30_days' | 'pro_90_days', string>>;
export const STORE_BASE_PLANS: Readonly<Record<'pro_30_days' | 'pro_90_days', string>>;
export const STORE_LAUNCH_PLANS: readonly ['pro_30_days'];
export const STORE_LAUNCH_PRODUCTS: Readonly<Pick<typeof STORE_PRODUCTS, 'pro_30_days'>>;
