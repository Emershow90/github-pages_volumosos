/**
 * Service Account Authentication for Google APIs (Sheets, Drive, etc.)
 * Uses Web Crypto API (RS256) to sign JWT assertion tokens without external dependencies.
 */

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Converts a PKCS#1 RSA Private Key DER Uint8Array to PKCS#8 DER Uint8Array
 */
function pkcs1ToPkcs8(pkcs1Bytes: Uint8Array): Uint8Array {
  // Helper to encode DER length
  function encodeLength(len: number): number[] {
    if (len < 128) return [len];
    if (len < 256) return [0x81, len];
    if (len < 65536) return [0x82, (len >> 8) & 0xff, len & 0xff];
    return [0x83, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff];
  }

  const octetLen = encodeLength(pkcs1Bytes.length);
  const algId = [0x02, 0x01, 0x00, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x04];
  const innerLen = algId.length + octetLen.length + pkcs1Bytes.length;
  const seqLen = encodeLength(innerLen);

  const pkcs8 = new Uint8Array(1 + seqLen.length + algId.length + octetLen.length + pkcs1Bytes.length);
  let offset = 0;
  pkcs8[offset++] = 0x30;
  for (const b of seqLen) pkcs8[offset++] = b;
  for (const b of algId) pkcs8[offset++] = b;
  for (const b of octetLen) pkcs8[offset++] = b;
  pkcs8.set(pkcs1Bytes, offset);
  return pkcs8;
}

/**
 * Convert PEM formatted private key to ArrayBuffer for WebCrypto
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const isPkcs1 = pem.includes('RSA PRIVATE KEY');
  let cleanPem = pem.replace(/\\n/g, '\n').replace(/\r/g, '');
  cleanPem = cleanPem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '');
  const b64 = cleanPem.replace(/[^A-Za-z0-9+/=]/g, '');
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    buf[i] = raw.charCodeAt(i);
  }

  if (isPkcs1) {
    return pkcs1ToPkcs8(buf).buffer;
  }

  return buf.buffer;
}

/**
 * Base64URL encode string or ArrayBuffer
 */
function base64UrlEncode(strOrBuffer: string | ArrayBuffer): string {
  let base64 = '';
  if (typeof strOrBuffer === 'string') {
    base64 = btoa(unescape(encodeURIComponent(strOrBuffer)));
  } else {
    const bytes = new Uint8Array(strOrBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const DEFAULT_CLIENT_EMAIL = 'supabase@gen-lang-client-0708272134.iam.gserviceaccount.com';
const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDCZg2KIAXzVeSB\nLUWGTwBHAExPJ/uZ0eE/WdJuR4bDwSJdkmQdEYqWZouwPP1s2H3tHkcIP1fwhX8D\ne1SQTFP4V8ammeyopYOu0WS6lm8pBhsCM6phBtCKwJtG9Z4luCDR9/NH7nL7oPsc\nuyRiAJxIez7gENFRs+Ar+pTvy5LCExmpcxXGdX72ekxc9JusVpg73uyLeNfPLEQw\nyhPoJIh0WfO6KiK3KHrRmGJIwg6kEw/FO/bfdUvY6cuxjSCHDJd3QrG8Y1HnU0GO\nh0kQYKY72EtQ7MEr7/0u+NUWyfBseF29Epg4fNj6PbAdfRkEEPrMY3M87TEj55RY\nExbDG69bAgMBAAECggEAMa260A2W97R/jLNxDP2raHmfBquFFK4aDgJ6UExfGC+H\nBLqgcv1EmWLjV8p+SQ6aP7p5FJZ7dq/m4ZDm72lSHCjyTykO3ZpOqKJCR5yiE63H\nwSxK4jjHmm3WQLAMFj+Tw5TFyyAYqk1dXt5EUfct+SflzYT+uQ5qv1JuNUmk24tr\nalUEXZ6KR/X2RoF48l9KIuYcCfDPboeygKhcZ3vq05JPALhwNNWG8wRV0pmq8Mt5\nnsrnqii8GnSdQB7RSWYOd+w6MyFq1uXl+XjTZTUKLrhKFuqnPunNoIrTvb2i4exs\nHChDNVd+TDDP2n2huqGye7XM7zWbbXYBqI0fWNTcAQKBgQD3DABl0oBjXfjovOFh\nFB+TXKED04mMXuc1GQZxqEobmJmtUKYn91FV2RwDJPbrCyMxNBEbNUHxecoVYjcJ\n11QRgszKkca6+B/KlC10WE23dlANRc3UVdGYGt6ByLk9DDP9kTem4GlV04DjT0rn\nAwWg66Y0tzqo5h74QUYeWeo12wKBgQDJcZpTtgmnJNJeHYqlmEW/E3P5eHTt5uXY\nfOjp+I6iq7zPz++yZj3N9THzDsTBu7CNB9XVaYGztj1ezhTzhtO7urOfo/vRcS1G\nr4gpvGiKUdB/2A5iQ/llWS+ZLl9xC0p1cJKfNNE9hA2g6pqu2ewm3T/0hoO38jDO\n+x9EvzdkgQKBgCQsQbKnC92A2P1bCrUoOSdenMTuqGlBTCFeNK9XsOIxie7yrCGV\n+PbU/2EGfJEV5GVD9m1BcxJkfs56vwxV1x1pRYszpSGjSyRiZfVvKJIAZOBMpEK+\n/h2DcakXNuhVbRdnt/pbSZEjku+1oIYKzzwsxP1bBt/MMiSvihDPoZeZAoGAY1S9\nQKH2yJCDmxz+DQG1Aq9Y9J7NKbI9jC6ruxNxYg1FIUPrchCwUSqi4rNZmh4uxJwk\neQN5jWBDisgb1KmbJmq9v+5gcbpZFQ3hGpNpCSumoCOtlA7on20G54XSUi+7G4XT\nBuZIdwjyn3KPq8CRjehzbOQXd1DZeHajyIZxjgECgYBeHSPJLTcGbKeaqsmI/+o5\nCcvvjVhae9BdtTJWpQmcGZhQ6HFdD8BJs15ejH/kImCcLcwOfNaDMhINAWNetD/E\n+ZsmEmgyxOjc0sSY2Ff1a6y30mB/l70lTjErewe12TiFi7AvzJrpkqkX/PJjZxg6\ngZ6VB1p8V1YtpAwWRJiomg==\n-----END PRIVATE KEY-----\n`;

/**
 * Get configured Service Account credentials from env or localStorage
 */
export function getServiceAccountCredentials(): ServiceAccountCredentials | null {
  // 1. Check environment variables
  const metaEnv = (import.meta as any).env || {};
  const envEmail = metaEnv.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const envKey = metaEnv.VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (envEmail && envKey) {
    return {
      client_email: envEmail,
      private_key: envKey,
    };
  }

  // 2. Check localStorage
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('google_service_account_credentials');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.client_email && parsed.private_key) {
          return {
            client_email: parsed.client_email,
            private_key: parsed.private_key,
          };
        }
      } catch {
        // Ignore parse error
      }
    }
  }

  // 3. Fallback default credentials provided by user
  if (DEFAULT_CLIENT_EMAIL && DEFAULT_PRIVATE_KEY) {
    return {
      client_email: DEFAULT_CLIENT_EMAIL,
      private_key: DEFAULT_PRIVATE_KEY,
    };
  }

  return null;
}

/**
 * Save Service Account credentials to localStorage
 */
export function saveServiceAccountCredentials(credentials: ServiceAccountCredentials): void {
  localStorage.setItem('google_service_account_credentials', JSON.stringify(credentials));
  cachedAccessToken = null;
  tokenExpiresAt = 0;
}

/**
 * Save Service Account from JSON string or object
 */
export function saveServiceAccountJson(jsonInput: string | Record<string, any>): boolean {
  try {
    const obj = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
    if (obj.client_email && obj.private_key) {
      saveServiceAccountCredentials({
        client_email: obj.client_email,
        private_key: obj.private_key,
      });
      return true;
    }
  } catch (err) {
    console.error('Error parsing Service Account JSON:', err);
  }
  return false;
}

/**
 * Clear saved Service Account credentials
 */
export function clearServiceAccountCredentials(): void {
  localStorage.removeItem('google_service_account_credentials');
  cachedAccessToken = null;
  tokenExpiresAt = 0;
}

/**
 * Core helper to sign JWT and fetch token using specified credentials
 */
async function generateTokenFromCredentials(
  creds: ServiceAccountCredentials,
  scopes: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: creds.client_email,
    scope: scopes,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('crypto.subtle não está disponível neste ambiente (requer conexão HTTPS ou contexto seguro)');
  }

  const keyBuffer = pemToArrayBuffer(creds.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64UrlEncode(signatureBuffer);
  const jwt = `${unsignedToken}.${encodedSignature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    let errDetail = '';
    try {
      const errJson = await res.json();
      errDetail = errJson.error_description || errJson.error || JSON.stringify(errJson);
    } catch {
      errDetail = await res.text();
    }
    throw new Error(`Google Auth API Error (${res.status}): ${errDetail}`);
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600);

  return cachedAccessToken;
}

/**
 * Generates an OAuth 2 access token for Google API using Service Account RS256 JWT
 */
export async function getServiceAccountToken(
  scopes: string = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file'
): Promise<string | null> {
  // Check if current cached token is still valid (with 60s safety buffer)
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && tokenExpiresAt > now + 60) {
    return cachedAccessToken;
  }

  const primaryCreds = getServiceAccountCredentials();
  if (!primaryCreds) {
    return null;
  }

  try {
    return await generateTokenFromCredentials(primaryCreds, scopes);
  } catch (err: unknown) {
    const message = (err as any)?.message || (err as any)?.name || String(err);
    console.warn('Erro ao autenticar com credenciais primárias:', message);

    // If localStorage credentials caused error (DataError, etc.), clear them and fallback to default
    if (typeof localStorage !== 'undefined' && localStorage.getItem('google_service_account_credentials')) {
      console.warn('Limpando credenciais corrompidas do localStorage e tentando fallback padrão corporativo...');
      localStorage.removeItem('google_service_account_credentials');

      const defaultCreds = {
        client_email: DEFAULT_CLIENT_EMAIL,
        private_key: DEFAULT_PRIVATE_KEY,
      };

      try {
        return await generateTokenFromCredentials(defaultCreds, scopes);
      } catch (fallbackErr: any) {
        console.error('Erro ao gerar token usando credenciais padrão:', fallbackErr);
      }
    }

    return null;
  }
}
