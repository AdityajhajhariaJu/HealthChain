/**
 * Resilient Razorpay SDK loader with script deduplication and error cleanup.
 */
let loadPromise: Promise<boolean> | null = null;

export function loadRazorpaySDK(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  
  if ((window as any).Razorpay) {
    return Promise.resolve(true);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      loadPromise = null;
      resolve(Boolean((window as any).Razorpay));
    };

    script.onerror = () => {
      loadPromise = null;
      script.remove();
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return loadPromise;
}
