<style>
/* Resetear restricciones externas y forzar nuestros estilos */
.wecc-unified-customer-form .card {
    background: white;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    padding: 20px;
    max-width: none !important; /* Eliminar restricción externa */
    width: 100% !important;
}

.wecc-unified-customer-form .card h3 {
    margin-top: 0;
    color: #2271b1;
    border-bottom: 2px solid #2271b1;
    padding-bottom: 10px;
}

.wecc-unified-customer-form .form-table {
    width: 100% !important;
    max-width: none !important;
}

.wecc-unified-customer-form .form-table th {
    width: 120px !important;
    vertical-align: top;
    padding-top: 10px;
    min-width: 120px;
}

.wecc-unified-customer-form .form-table td {
    width: auto !important;
    max-width: none !important;
}

.wecc-unified-customer-form .regular-text {
    width: 600px !important;
    max-width: 600px !important;
    min-width: 400px;
}

.wecc-unified-customer-form .large-text {
    width: 700px !important;
    max-width: 700px !important;
    min-width: 500px;
}

.wecc-unified-customer-form .description {
    color: #646970;
    font-style: italic;
    font-size: 13px;
}

/* Forzar ancho del contenedor principal */
.wecc-unified-customer-form {
    max-width: none !important;
    width: 100% !important;
}

/* Campos de selección */
.wecc-unified-customer-form select.regular-text {
    width: 300px !important;
    max-width: 300px !important;
}

/* Campos de fecha */
.wecc-unified-customer-form input[type="date"] {
    width: 200px !important;
}

/* Validación visual para número de cliente */
.wecc-customer-number-validation {
    margin-top: 5px;
    font-size: 12px;
    padding: 5px;
    border-radius: 3px;
    display: none;
}

.wecc-customer-number-validation.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
    display: block;
}

.wecc-customer-number-validation.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    display: block;
}
</style>
