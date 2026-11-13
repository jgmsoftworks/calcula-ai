interface Window {
  turnstile?: {
    render(container: HTMLElement, options: {
      sitekey: string; action: string; size: 'invisible';
      callback: (token: string) => void; 'error-callback': () => void;
    }): string;
  };
  dataLayer?: (IArguments | unknown[])[];
  gtag?: (...args: unknown[]) => void;
  __ga4_loaded__?: boolean;
}
