export const AuthenticationType = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
};

let mockSupportedTypes = [AuthenticationType.FACIAL_RECOGNITION];

export const __setMockSupportedTypes = (types: number[]) => {
  mockSupportedTypes = types;
};

export const hasHardwareAsync = async () => true;
export const isEnrolledAsync = async () => true;
export const supportedAuthenticationTypesAsync = async () => mockSupportedTypes;
export const authenticateAsync = async () => ({ success: true });
