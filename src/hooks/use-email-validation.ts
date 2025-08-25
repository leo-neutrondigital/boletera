// 🆕 Hook para validar email en tiempo real
import { useState, useCallback, useRef } from 'react';

interface EmailValidationResult {
  isValidating: boolean;
  emailExists: boolean | null;
  error: string | null;
}

export function useEmailValidation() {
  const [emailValidation, setEmailValidation] = useState<EmailValidationResult>({
    isValidating: false,
    emailExists: null,
    error: null
  });
  
  // 🔧 ARREGLO: Cache para evitar validaciones duplicadas
  const lastValidatedEmail = useRef<string>('');
  const validationCache = useRef<Map<string, boolean>>(new Map());

  // 🔧 ARREGLO: Usar useCallback para hacer la función estable
  const validateEmail = useCallback(async (email: string): Promise<void> => {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Reset si email está vacío o inválido
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setEmailValidation({
        isValidating: false,
        emailExists: null,
        error: null
      });
      return;
    }
    
    // 🔧 Evitar validaciones duplicadas
    if (lastValidatedEmail.current === normalizedEmail) {
      console.log('🚫 Skipping validation - already validated:', normalizedEmail);
      return;
    }
    
    // 🔧 Verificar cache
    if (validationCache.current.has(normalizedEmail)) {
      const cachedResult = validationCache.current.get(normalizedEmail)!;
      console.log('💾 Using cached result for:', normalizedEmail, cachedResult);
      setEmailValidation({
        isValidating: false,
        emailExists: cachedResult,
        error: null
      });
      lastValidatedEmail.current = normalizedEmail;
      return;
    }

    lastValidatedEmail.current = normalizedEmail;
    setEmailValidation(prev => ({
      ...prev,
      isValidating: true,
      error: null
    }));

    try {
      console.log('🔍 Validating email (new):', normalizedEmail);
      
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!response.ok) {
        throw new Error('Error checking email');
      }

      const result = await response.json();
      
      console.log('✅ Email validation result:', result);
      
      // 🔧 Guardar en cache
      validationCache.current.set(normalizedEmail, result.exists);
      
      setEmailValidation({
        isValidating: false,
        emailExists: result.exists,
        error: null
      });

    } catch (error) {
      console.error('❌ Email validation error:', error);
      setEmailValidation({
        isValidating: false,
        emailExists: null,
        error: 'Error validando email'
      });
    }
  }, []); // 🔧 Array vacío - función estable

  const resetValidation = useCallback(() => {
    setEmailValidation({
      isValidating: false,
      emailExists: null,
      error: null
    });
    lastValidatedEmail.current = '';
  }, []);

  return {
    emailValidation,
    validateEmail,
    resetValidation
  };
}
