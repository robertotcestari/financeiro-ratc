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

  if (!email || !password) {
    throw new Error(
      'IMOBZI_EMAIL and IMOBZI_PASSWORD environment variables are required'
    );
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=AIzaSyAFwmj0iszcf433EvcZ2bxs-XrK49ma4xA',
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