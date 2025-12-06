// WebAuthn (Biometric Authentication) Service
// Supports Face ID, Touch ID, Windows Hello, etc.

export interface WebAuthnCredential {
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransport[];
  createdAt: string;
}

export interface RegistrationOptions {
  challenge: ArrayBuffer;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: ArrayBuffer;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: "public-key";
    alg: number;
  }>;
  timeout: number;
  attestation: "direct" | "indirect" | "none";
}

/**
 * Check if browser supports WebAuthn
 */
export const isWebAuthnSupported = (): boolean => {
  return !!(
    (window as any).PublicKeyCredential &&
    navigator.credentials &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function'
  );
};

/**
 * Check if platform authenticator available (Face/Touch ID)
 */
export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    return false;
  }
};

/**
 * Register biometric authenticator
 */
export const registerBiometric = async (
  userId: string,
  userName: string,
  userEmail: string
): Promise<WebAuthnCredential | null> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported on this browser');
  }

  try {
    // Generate random challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId_encoded = new TextEncoder().encode(userId);

    const registrationOptions: RegistrationOptions = {
      challenge: challenge as unknown as ArrayBuffer,
      rp: {
        name: "Shared Parenting App",
        id: window.location.hostname,
      },
      user: {
        id: userId_encoded as unknown as ArrayBuffer,
        name: userEmail,
        displayName: userName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: "indirect",
    };

    // Prompt user to register biometric
    const credential = await navigator.credentials.create({
      publicKey: registrationOptions,
    }) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Biometric registration cancelled');
    }

    // Convert credential to storable format
    const credentialPublicKey = new Uint8Array(
      ((credential.response as AuthenticatorAttestationResponse).getPublicKey?.() as ArrayBuffer) || []
    );

    const webauthnCredential: WebAuthnCredential = {
      credentialId: base64Encode(new Uint8Array(credential.id as unknown as ArrayBuffer)),
      publicKey: base64Encode(credentialPublicKey),
      counter: 0,
      transports: ((credential.response as AuthenticatorAttestationResponse).getTransports?.() as AuthenticatorTransport[]) || undefined,
      createdAt: new Date().toISOString(),
    };

    return webauthnCredential;
  } catch (error) {
    console.error('Biometric registration error:', error);
    throw error;
  }
};

/**
 * Authenticate with biometric
 */
export const authenticateWithBiometric = async (
  credentialIds: string[]
): Promise<boolean> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported on this browser');
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const assertionOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge as unknown as ArrayBuffer,
      timeout: 60000,
      userVerification: "preferred",
      allowCredentials: credentialIds.map(id => ({
        type: "public-key" as const,
        id: base64Decode(id),
      })) as PublicKeyCredentialDescriptor[],
    };

    // Prompt user for biometric authentication
    const assertion = await navigator.credentials.get({
      publicKey: assertionOptions,
    }) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('Authentication cancelled');
    }

    return true;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    throw error;
  }
};

/**
 * Helper: Encode to Base64
 */
const base64Encode = (data: Uint8Array): string => {
  return btoa(String.fromCharCode.apply(null, Array.from(data)));
};

/**
 * Helper: Decode from Base64
 */
const base64Decode = (data: string): Uint8Array => {
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Get browser support info
 */
export const getBrowserSupport = async (): Promise<{
  supported: boolean;
  platformAuthenticator: boolean;
  browsername: string;
}> => {
  const supported = isWebAuthnSupported();
  const platformAuthenticator = supported ? await isPlatformAuthenticatorAvailable() : false;
  
  let browsername = 'Unknown';
  if (navigator.userAgent.includes('Chrome')) browsername = 'Chrome';
  else if (navigator.userAgent.includes('Firefox')) browsername = 'Firefox';
  else if (navigator.userAgent.includes('Safari')) browsername = 'Safari';
  else if (navigator.userAgent.includes('Edge')) browsername = 'Edge';

  return { supported, platformAuthenticator, browsername };
};
