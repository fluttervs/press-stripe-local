export const INPUT_TAGS = {
  initialize: 'INITIALIZE_GOOGLE_TAG_MANAGER',
  checkLoaded: 'CHECK_GTM_LOADED',
  trackEvent: 'TRACK_EVENT',
  trackPageView: 'TRACK_PAGE_VIEW',
  trackRaw: 'TRACK_RAW',
} as const;

export type Dimension = {
  name: string;
  value: any;
};

export type TrackRawInput = {
  tag: typeof INPUT_TAGS.trackRaw;
  allowedCookies?: string;
} & Record<string, string>;

export type TrackEventInput = {
  tag: typeof INPUT_TAGS.trackEvent;
  action: string;
  category?: string;
  label?: string;
  value?: number;
  url?: string;
  dimensions?: Dimension[];
  allowedCookies?: string;
};

export type TrackPageViewInput = {
  tag: typeof INPUT_TAGS.trackPageView;
  url: string;
  id?: string;
  title?: string;
  referrer?: string;
  isVirtual?: boolean;
  allowedCookies?: string;
};

export type CheckGTMLoadedInput = {
  tag: typeof INPUT_TAGS.checkLoaded;
};

export type CheckGTMLoadedOutput = {
  isGTMLoaded: boolean;
};

export type SetupOptions = {
  cookieDomain?: string;
  dataLayerVariables?: Record<string, string>;
};

export type InitializeGoogleTagManagerInput = {
  tag: typeof INPUT_TAGS.initialize;
  message: {
    apiKey: string;
  };
  setupOptions?: SetupOptions;
  dimensions?: Dimension[];
  domains?: string[];
};

export type GoogleTagManagerInboundPayload =
  | InitializeGoogleTagManagerInput
  | CheckGTMLoadedInput
  | TrackRawInput
  | TrackEventInput
  | TrackPageViewInput;

export type GoogleTagManagerOutboundPayload = CheckGTMLoadedOutput;
