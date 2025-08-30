// src/lib/utils/revalidation.ts

/**
 * Helper para revalidar paths específicos desde el frontend
 */
export async function revalidatePaths(paths: string[], token?: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/admin/revalidate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      console.error('Failed to revalidate paths:', await response.text());
      return false;
    }

    const result = await response.json();
    console.log('✅ Revalidation result:', result);
    return result.success;
    
  } catch (error) {
    console.error('❌ Error during revalidation:', error);
    return false;
  }
}

/**
 * Helper específico para revalidar un evento después de actualizarlo
 */
export async function revalidateEvent(slug: string, token?: string): Promise<boolean> {
  const paths = [
    `/events/${slug}`,
    '/dashboard/eventos',
  ];
  
  return revalidatePaths(paths, token);
}
