// Minimal WebAuthn DOM types for server-side compilation
// This avoids pulling full DOM lib while allowing TS to compile references

interface PublicKeyCredentialDescriptor {
  type: 'public-key';
  id: string | ArrayBuffer | Uint8Array;
  transports?: string[];
}

