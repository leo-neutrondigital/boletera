/* WECC Dashboard JavaScript */

jQuery(document).ready(function($) {
    
    // Auto-refresh dashboard every 5 minutes
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos
    
    // Add refresh button to page
    addRefreshButton();
    
    // Set up auto-refresh
    setInterval(refreshDashboard, REFRESH_INTERVAL);
    
    /**
     * Add refresh button to dashboard header
     */
    function addRefreshButton() {
        const refreshBtn = $(`
            <button type="button" class="button button-secondary wecc-refresh-btn" style="margin-left: 10px;">
                <span class="dashicons dashicons-update"></span> Actualizar
            </button>
        `);
        
        $('.wp-heading-inline').after(refreshBtn);
        
        refreshBtn.on('click', function(e) {
            e.preventDefault();
            refreshDashboard();
        });
    }
    
    /**
     * Refresh dashboard data
     */
    function refreshDashboard() {
        const $refreshBtn = $('.wecc-refresh-btn');
        const $icon = $refreshBtn.find('.dashicons');
        
        // Show loading state
        $icon.addClass('wecc-spinning');
        $refreshBtn.prop('disabled', true);
        
        // Simulate refresh (in a real implementation, this would be an AJAX call)
        setTimeout(function() {
            // Update timestamp
            const now = new Date();
            const timeString = now.toLocaleString('es-MX', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            $('.description').html(`
                Resumen ejecutivo del sistema de crédito - 
                Última actualización: ${timeString}
            `);
            
            // Show success animation
            showRefreshSuccess();
            
            // Reset button state
            $icon.removeClass('wecc-spinning');
            $refreshBtn.prop('disabled', false);
            
        }, 1500);
    }
    
    /**
     * Show refresh success animation
     */
    function showRefreshSuccess() {
        const $cards = $('.wecc-card');
        
        $cards.each(function(index) {
            const $card = $(this);
            
            setTimeout(function() {
                $card.addClass('wecc-refreshed');
                
                setTimeout(function() {
                    $card.removeClass('wecc-refreshed');
                }, 600);
                
            }, index * 100);
        });
    }
    
    /**
     * Add hover effects to metrics
     */
    $('.wecc-metric, .wecc-status-item, .wecc-quality-item').on('mouseenter', function() {
        $(this).addClass('wecc-metric-hover');
    }).on('mouseleave', function() {
        $(this).removeClass('wecc-metric-hover');
    });
    
    /**
     * Add click-to-copy functionality for important values
     */
    $('.wecc-metric-value, .wecc-big-number').on('click', function() {
        const text = $(this).text().trim();
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function() {
                showCopySuccess($(this));
            }.bind(this));
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showCopySuccess($(this));
        }
    });
    
    /**
     * Show copy success feedback
     */
    function showCopySuccess($element) {
        const originalText = $element.text();
        $element.text('¡Copiado!');
        $element.addClass('wecc-copied');
        
        setTimeout(function() {
            $element.text(originalText);
            $element.removeClass('wecc-copied');
        }, 1000);
    }
    
    /**
     * Format numbers on load
     */
    function formatNumbers() {
        $('.wecc-metric-value, .wecc-big-number, .wecc-trend-current').each(function() {
            const $this = $(this);
            const text = $this.text();
            
            // Add tooltip with full number if it contains currency
            if (text.includes('$') || text.includes(',')) {
                $this.attr('title', 'Click para copiar: ' + text);
            }
        });
    }
    
    formatNumbers();
    
});

/* CSS Animations */
const style = document.createElement('style');
style.textContent = `
    .wecc-spinning {
        animation: wecc-spin 1s linear infinite;
    }
    
    @keyframes wecc-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .wecc-refreshed {
        animation: wecc-refresh-pulse 0.6s ease-out;
    }
    
    @keyframes wecc-refresh-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
    }
    
    .wecc-metric-hover {
        transform: scale(1.05);
        transition: transform 0.2s ease;
        cursor: pointer;
    }
    
    .wecc-copied {
        background: #28a745 !important;
        color: white !important;
        transition: all 0.3s ease;
    }
    
    .wecc-metric-value, .wecc-big-number {
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .wecc-metric-value:hover, .wecc-big-number:hover {
        opacity: 0.8;
    }
`;

document.head.appendChild(style);
