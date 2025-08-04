// src/app/not-found.tsx
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-4">
      <div>
        <h1 className="text-4xl font-bold mb-4">Página no encontrada</h1>
        <p className="text-lg text-gray-600">
          Lo sentimos, la página que buscas no existe.
        </p>
      </div>
    </div>
  );
}