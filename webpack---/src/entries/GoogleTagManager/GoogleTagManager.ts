import type {AppConfig} from '../initialize';
import type {
  Dimension,
  GoogleTagManagerInboundPayload as InboundPayload,
  InitializeGoogleTagManagerInput,
  CheckGTMLoadedOutput as OutboundPayload,
  SetupOptions,
  TrackEventInput,
  TrackPageViewInput,
  TrackRawInput,
} from '../../shared/GoogleTagManagerTypes';
import {initialize} from '../initialize';
import {INPUT_TAGS} from '../../shared/GoogleTagManagerTypes';
import type {SendFn} from '../setupMessages';

export const GOOGLE_TAG_MANAGER_SCRIPT_LOCATION =
  'https://www.googletagmanager.com/gtm.js';

const gtag = (event: any): void => {
  // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
  if (window.dataLayer) {
    // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
    window.dataLayer.push(event);
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/cookies-user-id#configure_cookie_field_settings
const configureCookieFields = (setupOptions?: SetupOptions): void => {
  // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
  if (window.dataLayer) {
    // https://developers.google.com/analytics/devguides/collection/ga4/reference/config#cookie_domain
    // https://www.simoahava.com/analytics/cookieflags-field-google-analytics/

    // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
    window.dataLayer.push([
      'set',
      'cookie_domain',
      setupOptions?.cookieDomain ?? 'auto',
    ]);
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/custom-dims-mets
const configureCustomDimensions = (
  apiKey: string,
  dimensions: Dimension[],
): void => {
  // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
  if (window.dataLayer) {
    const dimensionsMap: Record<string, any> = {};
    dimensions.forEach((dimension, index) => {
      // Google requires the following format for our custom dimensions: dimension<Index> (e.g. dimension3)
      dimensionsMap[`dimension${index + 1}`] = dimension.name;
    });

    // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
    window.dataLayer.push('config', apiKey, {
      custom_map: dimensionsMap,
    });
  }
};

// Allows cross domain tracking for a GTM container
// https://developers.google.com/tag-platform/devguides/cross-domain#basic_setup
const configureDomains = (domains: string[]): void => {
  // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
  if (window.dataLayer) {
    // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
    window.dataLayer.push('set', 'linker', {
      domains,
    });
  }
};

const trackEvent = ({tag, ...rest}: TrackEventInput): void => {
  gtag({event: 'event', ...rest});
};

const trackRaw = ({...params}: TrackRawInput): void => {
  const {tag, ...rest} = params;
  gtag({...rest});
};

const trackPageView = ({
  tag,
  isVirtual = false,
  ...rest
}: TrackPageViewInput): void => {
  gtag({event: isVirtual ? 'virtual-pageview' : 'pageview', ...rest});
};

/**
 * Method to check whether Google Tag Manager has already been loaded
 * or is in the process of loading.
 *
 * @return {Boolean}
 * Whether Google Analytics is already loaded.
 */
const googleTagManagerIsPresent = (): boolean => {
  return (
    (window.hasOwnProperty('dataLayer') &&
      // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
      typeof window.dataLayer === 'object') ||
    document.querySelectorAll(
      `script[src*="${GOOGLE_TAG_MANAGER_SCRIPT_LOCATION}"]`,
    ).length > 0
  );
};

export const checkGTMLoaded = (): OutboundPayload => {
  return {isGTMLoaded: googleTagManagerIsPresent()};
};

// NB: In order for GTM deployed GA4 to work in sandboxed iframe, `cookie_flags` must be set in the GTM UI. Specifically we must add `cookie_flags` tag with value `SameSite=None;Secure` to the GA4 configuration tag in GTM under "Fields to Set". Configuring with code does not work when deploying tag with GTM.
// See also: https://developers.google.com/analytics/devguides/collection/gtagjs/cookies-user-id#configure_cookie_field_settings
// https://support.google.com/tagmanager/answer/13438166
const injectGoogleTagManager = (
  action: InitializeGoogleTagManagerInput,
): void => {
  // Use the Google Tag Manager injection code directly. It's asynchronous, so we start loading it
  // first, and can comfortably configure it directly afterwards.

  if (!googleTagManagerIsPresent()) {
    // Google Tag Manger code per https://developers.google.com/tag-platform/tag-manager/web
    /* eslint-disable */
    // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'. | TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
    window.dataLayer = window.dataLayer || [];
    (function (w, d, s, l, i) {
      // @ts-expect-error - TS7015 - Element implicitly has an 'any' type because index expression is not of type 'number'. | TS7015 - Element implicitly has an 'any' type because index expression is not of type 'number'.
      w[l] = w[l] || [];
      // @ts-expect-error - TS7015 - Element implicitly has an 'any' type because index expression is not of type 'number'.
      w[l].push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js',
        // NB: dataLayer variables must be set before the GTM script is loaded
        ...(action.setupOptions?.dataLayerVariables || {}),
      });

      var f = d.getElementsByTagName(s)[0],
        j = d.createElement(s),
        dl = l != 'dataLayer' ? '&l=' + l : '';

      // @ts-expect-error - TS2339 - Property 'async' does not exist on type 'HTMLElement'.
      j.async = true;
      // @ts-expect-error - TS2339 - Property 'src' does not exist on type 'HTMLElement'.
      j.src = GOOGLE_TAG_MANAGER_SCRIPT_LOCATION + '?id=' + i + dl;

      f.parentNode?.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', action.message.apiKey);
    /* eslint-enable */
  }

  // @ts-expect-error - TS2339 - Property 'dataLayer' does not exist on type 'Window & typeof globalThis'.
  if (window.dataLayer) {
    const {setupOptions, dimensions, domains} = action;
    configureCookieFields(setupOptions);

    if (domains) {
      configureDomains(domains);
    }

    if (dimensions) {
      configureCustomDimensions(action.message.apiKey, dimensions);
    }
  }
};

const googleTagManager = (
  action: InboundPayload,
  respond: SendFn<'GoogleTagManager'>,
) => {
  if (action.tag === INPUT_TAGS.initialize) {
    injectGoogleTagManager(action);
  } else if (action.tag === INPUT_TAGS.checkLoaded) {
    respond(checkGTMLoaded());
  } else if (action.tag === INPUT_TAGS.trackRaw) {
    trackRaw(action);
  } else if (action.tag === INPUT_TAGS.trackEvent) {
    trackEvent(action);
  } else if (action.tag === INPUT_TAGS.trackPageView) {
    trackPageView(action);
  } else {
    // @ts-expect-error - TS2339 - Property 'tag' does not exist on type 'never'.
    throw new Error(`Unhandled message/request type: ${action.tag}`);
  }
};

const app = (config: AppConfig<'GoogleTagManager'>) => {
  config.subscribe((messageData, respond) => {
    googleTagManager(messageData, respond);
  });
};

initialize({
  app,
  owner: 'dashboard_foundation',
});
