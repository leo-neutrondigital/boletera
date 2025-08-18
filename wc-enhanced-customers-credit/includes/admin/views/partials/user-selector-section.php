<!-- Selector de usuario para nuevo cliente -->
<div class="card" style="margin-bottom: 20px;">
    <h3>👤 Seleccionar Usuario</h3>
    <table class="form-table">
        <tr>
            <th><label for="wecc_user_search">Usuario</label></th>
            <td>
                <input type="hidden" name="user_id" id="wecc_user_id" value="">
                <input type="text" id="wecc_user_search" class="regular-text" 
                       placeholder="Buscar usuario por email..." autocomplete="off">
                <p class="description">Escribe para buscar usuarios existentes o <a href="<?php echo admin_url('user-new.php'); ?>" target="_blank">crear nuevo usuario</a>.</p>
            </td>
        </tr>
    </table>
</div>
