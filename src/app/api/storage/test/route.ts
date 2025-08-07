import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth/server-auth';
import { StorageFactory } from '@/lib/storage/storage-factory';

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticación (solo admins)
    const authUser = await getAuthFromRequest(request);
    if (!authUser || !authUser.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 2. Probar conexión con storage
    const storage = await StorageFactory.create();
    
    let connectionTest = { success: false, message: 'Method not available' };
    
    // Si el storage tiene método de verificación, usarlo
    if ('checkConnection' in storage && typeof storage.checkConnection === 'function') {
      connectionTest = await (storage as any).checkConnection();
    } else if ('checkConfiguration' in storage && typeof storage.checkConfiguration === 'function') {
      connectionTest = await (storage as any).checkConfiguration();
    } else {
      connectionTest = {
        success: true,
        message: 'Storage created successfully (no test method available)'
      };
    }

    return NextResponse.json({
      success: true,
      storage_type: process.env.STORAGE_TYPE || 'local',
      connection_test: connectionTest,
      config: {
        api_url: process.env.STORAGE_API_URL ? '✅ Configured' : '❌ Missing',
        api_token: process.env.STORAGE_API_TOKEN ? '✅ Configured' : '❌ Missing',
        app_url: process.env.NEXT_PUBLIC_APP_URL || 'Not set'
      }
    });

  } catch (error) {
    console.error('❌ Error testing storage:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      storage_type: process.env.STORAGE_TYPE || 'local'
    });
  }
}
