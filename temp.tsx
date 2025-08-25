      
      {/* 📄 PAGINACIÓN */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="border-t bg-white pt-4 space-y-4">
          {/* Paginación para Ventas */}
          {(activeTab === "sales" || activeTab === "all") && filteredSalesOrders.length > 0 && data?.sales && (
            <PaginationControls
              currentPage={salesPage}
              totalPages={data.sales.pagination?.totalPages || 1}
              totalItems={data.sales.pagination?.totalItems || 0}
              itemsPerPage={salesLimit}
              onPageChange={handleSalesPageChange}
              onItemsPerPageChange={handleSalesLimitChange}
              label="ventas"
            />
          )}
          
          {/* Paginación para Cortesías */}
          {(activeTab === "courtesies" || activeTab === "all") && filteredCourtesyOrders.length > 0 && data?.courtesies && (
            <PaginationControls
              currentPage={courtesyPage}
              totalPages={data.courtesies.pagination?.totalPages || 1}
              totalItems={data.courtesies.pagination?.totalItems || 0}
              itemsPerPage={courtesyLimit}
              onPageChange={handleCourtesyPageChange}
              onItemsPerPageChange={handleCourtesyLimitChange}
              label="cortesías"
            />
          )}
        </div>
      </div>
    </>
  );
}