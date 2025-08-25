'use client';

import { Calendar, Ticket, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EventsHero() {
  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 overflow-hidden">
      {/* Patrón de fondo */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1.5\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
        }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>Encuentra tu próximo evento</span>
          </div>

          {/* Título principal */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Eventos que no te
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              puedes perder
            </span>
          </h1>

          {/* Subtítulo */}
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
            Descubre experiencias únicas, compra tus boletos de forma segura y vive momentos inolvidables. 
            Todo en un solo lugar.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8 py-3 h-12"
              onClick={() => {
                document.querySelector('#eventos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Ver Eventos
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 font-semibold px-8 py-3 h-12"
              onClick={() => {
                window.location.href = '/my-tickets';
              }}
            >
              <Ticket className="w-5 h-5 mr-2" />
              Mis Boletos
            </Button>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">100+</div>
              <div className="text-blue-200 text-sm">Eventos disponibles</div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">50K+</div>
              <div className="text-blue-200 text-sm">Usuarios satisfechos</div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Ticket className="w-8 h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">99.9%</div>
              <div className="text-blue-200 text-sm">Entregas exitosas</div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Elemento decorativo */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-12 text-blue-50"
          preserveAspectRatio="none"
          viewBox="0 0 1200 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,120 C300,90 600,90 900,120 C1050,135 1150,120 1200,110 L1200,120 Z"
            className="fill-current"
          ></path>
        </svg>
      </div>
    </div>
  );
}
