import { getAuth } from 'firebase/auth';

// Funciones utilitarias para hacer requests autenticadas desde el cliente

export async function getAuthToken(): Promise<string | null> {
  try {
    // Usar Firebase Auth directamente
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    console.log('🔍 Getting auth token, current user:', {
      uid: currentUser?.uid,
      email: currentUser?.email,
      isSignedIn: !!currentUser
    });
    
    if (currentUser) {
      const token = await currentUser.getIdToken();
      console.log('✅ Auth token obtained, length:', token.length);
      return token;
    }
    
    console.warn('⚠️ No authenticated user found');
    return null;
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
    return null;
  }
}

export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Wrapper para POST requests autenticados
export async function authenticatedPost(
  url: string, 
  data?: any
): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Wrapper para PUT requests autenticados  
export async function authenticatedPut(
  url: string, 
  data: any
): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Wrapper para GET requests autenticados
export async function authenticatedGet(url: string): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'GET',
  });
}
