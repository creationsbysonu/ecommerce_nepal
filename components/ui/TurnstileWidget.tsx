'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { forwardRef } from 'react';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

/**
 * Wraps Cloudflare Turnstile.
 * Forward a ref to get access to the TurnstileInstance (e.g. for reset()).
 */
const TurnstileWidget = forwardRef<TurnstileInstance, TurnstileWidgetProps>(
  ({ onSuccess, onError, onExpire }, ref) => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;

    return (
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        options={{
          theme: 'light',
          size: 'normal',
        }}
        style={{ marginTop: '8px' }}
      />
    );
  }
);

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
