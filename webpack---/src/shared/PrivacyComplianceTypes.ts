export const INPUT_TAGS = {
  checkLoaded: 'CHECK_PRIVACY_COMPLIANCE_LOADED',
} as const;

export type CheckPrivacyComplianceLoadedInput = {
  tag: typeof INPUT_TAGS.checkLoaded;
};

export type CheckPrivacyComplianceLoadedOutput = {
  _ga: string | null | undefined;
};

export type PrivacyComplianceInboundPayload = CheckPrivacyComplianceLoadedInput;

export type PrivacyComplianceOutboundPayload =
  CheckPrivacyComplianceLoadedOutput;
