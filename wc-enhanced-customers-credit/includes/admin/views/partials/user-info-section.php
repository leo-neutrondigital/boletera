<!-- Información de WordPress (readonly) -->
<div class="card" style="margin-bottom: 20px;">
    <h3>👤 Datos de WordPress</h3>
    <table class="form-table">
        <tr>
            <th>Usuario</th>
            <td>
                <strong><?php echo esc_html($user->display_name); ?></strong><br>
                <small>Email: <?php echo esc_html($user->user_email); ?> | Login: <?php echo esc_html($user->user_login); ?></small>
            </td>
        </tr>
    </table>
</div>
