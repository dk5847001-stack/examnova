let loadingPromise = null;

export function loadRazorpayCheckout() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Razorpay checkout can only be loaded in a browser context."));
  }

  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-examnova-script="razorpay-checkout"]');
    const script = existingScript || document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "strict-origin";
    script.dataset.examnovaScript = "razorpay-checkout";
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
        return;
      }
      loadingPromise = null;
      reject(new Error("Razorpay checkout failed to load."));
    };
    script.onerror = () => {
      loadingPromise = null;
      script.remove();
      reject(new Error("Unable to load Razorpay checkout script."));
    };

    if (!existingScript) {
      document.body.appendChild(script);
    }
  });

  return loadingPromise;
}
