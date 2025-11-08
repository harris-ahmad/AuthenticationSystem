import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const API_URL = 'http://localhost:3000';

export async function registerPasskey(accessToken, credentialName = 'My Passkey') {
  try {
    const optionsRes = await fetch(`${API_URL}/auth/webauthn/register/options`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const { options } = await optionsRes.json();

    const attResp = await startRegistration(options);

    const verifyRes = await fetch(`${API_URL}/auth/webauthn/register/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response: attResp,
        credentialName,
      }),
    });

    const result = await verifyRes.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    return result;
  } catch (error) {
    console.error('Passkey registration error:', error);
    throw error;
  }
}

export async function loginWithPasskey(username) {
  try {
    const optionsRes = await fetch(`${API_URL}/auth/webauthn/login/options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    const { options } = await optionsRes.json();

    const asseResp = await startAuthentication(options);

    const verifyRes = await fetch(`${API_URL}/auth/webauthn/login/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response: asseResp,
        username,
      }),
    });

    const result = await verifyRes.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    return result;
  } catch (error) {
    console.error('Passkey login error:', error);
    throw error;
  }
}

export async function listPasskeys(accessToken) {
  const res = await fetch(`${API_URL}/auth/webauthn/credentials`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const { credentials } = await res.json();
  return credentials;
}

export async function deletePasskey(accessToken, credentialId) {
  const res = await fetch(`${API_URL}/auth/webauthn/credentials/${credentialId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const result = await res.json();
  return result;
}

export async function renamePasskey(accessToken, credentialId, newName) {
  const res = await fetch(`${API_URL}/auth/webauthn/credentials/${credentialId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  });

  const result = await res.json();
  return result;
}
