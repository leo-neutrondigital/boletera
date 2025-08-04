import dynamic from 'next/dynamic'

const PruebaFirebase = dynamic(() => import('./prueba-client'), { ssr: false });

export default function Page() {
  return (
    <>
      <PruebaFirebase />
      {/* resto del contenido */}
    </>
  )
}