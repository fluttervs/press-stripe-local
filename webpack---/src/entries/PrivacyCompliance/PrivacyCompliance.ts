import Cookies from 'js-cookie';
import type {PrivacyComplianceInboundPayload as InboundPayload} from '../../shared/PrivacyComplianceTypes';
import {INPUT_TAGS} from '../../shared/PrivacyComplianceTypes';
import type {AppConfig} from '../initialize';
import {initialize} from '../initialize';
import type {SendFn} from '../setupMessages';

const runPrivacyComplianceScript = () => {
  // It's fine to retrieve cookies directly from the browser without the
  // stripe-cookies library because the scripts in stripethirdparty are
  // only loaded if the user has consented to cookies on the main frame.
  // This script is also audited by Privacy Engineering to ensure that it
  // exclusively reads appropriate cookies, as the cookie-perms cookie
  // is not available in the iframe context.
  return {
    _ga: Cookies.get('_ga'),
  };
};

const privacyCompliance = (
  action: InboundPayload,
  respond: SendFn<'PrivacyCompliance'>,
) => {
  if (action.tag === INPUT_TAGS.checkLoaded) {
    respond(runPrivacyComplianceScript());
  } else {
    throw new Error(`Unhandled message/request type: ${action.tag}`);
  }
};

const app = (config: AppConfig<'PrivacyCompliance'>) => {
  config.subscribe((messageData, respond) => {
    privacyCompliance(messageData, respond);
  });
};

initialize({app, owner: 'privacy_products'});
