'use client'

import { auth } from '@/lib/firebase/client'
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'

export default function PruebaFirebase() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('✅ Usuario detectado:', user)
    })

    return () => unsubscribe()
  }, [])

  return <div>Prueba Firebase en cliente</div>
}