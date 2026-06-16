/**
 * Authentication module for Imobzi API
 * Uses Google Identity Toolkit for authentication
 */

interface AuthResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
}

/**
 * Get authentication token from Imobzi/Firebase
 * @returns Promise with the authentication token
 */
export async function getImobziAuthToken(): Promise<string> {
  const email = process.env.IMOBZI_EMAIL;
  const password = process.env.IMOBZI_PASSWORD;
  const firebaseApiKey = process.env.IMOBZI_FIREBASE_API_KEY;

  if (!email || !password || !firebaseApiKey) {
    throw new Error(
      'IMOBZI_EMAIL, IMOBZI_PASSWORD and IMOBZI_FIREBASE_API_KEY environment variables are required'
    );
  }

  try {
    const authUrl = new URL(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword'
    );
    authUrl.searchParams.set('key', firebaseApiKey);

    const response = await fetch(
      authUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Authentication failed: ${error.error?.message || 'Unknown error'}`
      );
    }

    const data: AuthResponse = await response.json();
    return data.idToken;
  } catch (error) {
    console.error('Imobzi authentication error:', error);
    throw new Error(
      `Failed to authenticate with Imobzi: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
