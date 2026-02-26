<?php
// Definir o fuso horário padrão
date_default_timezone_set('America/Sao_Paulo');

// conexão com o banco de dados
$servername = "localhost";
$username = "admin-bot";
$password = "FY4N6wd7prJksVvIPnbS";
$dbname = "whatsapp-scheduler";

$conn = new mysqli($servername, $username, $password, $dbname);

// verificar a conexão
if ($conn->connect_error) {
    die("Conexão falhou: " . $conn->connect_error);
}
?>
