<?php
session_start();
$mensagem = '';
$tipo_mensagem = '';

// Inclui o arquivo de conexão
require_once 'conexao.php';

// Número do bot WhatsApp (formato internacional)
$numero_bot = '5519987343197';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Usa a conexão já estabelecida em conexao.php
    if (!isset($conn) || $conn->connect_error) {
        die("Conexão falhou: " . $conn->connect_error);
    }
    
    $nome = $conn->real_escape_string($_POST['nome']);
    $telefone_original = preg_replace("/[^0-9]/", "", $_POST['telefone']); // Remove caracteres não numéricos
    
    // CORREÇÃO: Converte para formato internacional (WhatsApp)
    // Se tem 11 dígitos (DDD + número), adiciona código do país 55
    if (strlen($telefone_original) == 11) {
        $telefone = '55' . $telefone_original; // Adiciona código do país
    } else if (strlen($telefone_original) == 13 && substr($telefone_original, 0, 2) == '55') {
        $telefone = $telefone_original; // Já está no formato correto
    } else {
        // Formato inválido
        $_SESSION['mensagem'] = "Formato de telefone inválido! Use o formato (11) 99999-9999";
        $_SESSION['tipo_mensagem'] = "danger";
        header("Location: " . $_SERVER['PHP_SELF']);
        exit();
    }
    
    $email = $conn->real_escape_string($_POST['email']);
    $senha = password_hash($_POST['senha'], PASSWORD_DEFAULT);
    
    // Verifica se o e-mail ou telefone já existe (testando ambos os formatos)
    $telefone_sem_55 = substr($telefone, 2); // Remove o 55 para testar também
    $sql_check = "SELECT id FROM usuarios WHERE email = ? OR telefone = ? OR telefone = ?";
    $stmt_check = $conn->prepare($sql_check);
    $stmt_check->bind_param("sss", $email, $telefone, $telefone_sem_55);
    $stmt_check->execute();
    $result_check = $stmt_check->get_result();
    
    if ($result_check->num_rows > 0) {
        $_SESSION['mensagem'] = "Este e-mail ou telefone já está cadastrado!";
        $_SESSION['tipo_mensagem'] = "danger";
        $stmt_check->close();
        header("Location: " . $_SERVER['PHP_SELF']);
        exit();
    }
    $stmt_check->close();
    
    // Se não existe, procede com o cadastro usando formato internacional
    $sql = "INSERT INTO usuarios (nome, telefone, email, senha) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssss", $nome, $telefone, $email, $senha);
    
    if ($stmt->execute()) {
        $_SESSION['mensagem'] = "Cadastro realizado com sucesso! Telefone salvo: " . $telefone;
        $_SESSION['tipo_mensagem'] = "success";
    } else {
        $_SESSION['mensagem'] = "Erro ao cadastrar: " . $conn->error;
        $_SESSION['tipo_mensagem'] = "danger";
    }
    
    $stmt->close();
    $conn->close();
    
    // Redireciona após o POST para evitar reenvio do formulário
    header("Location: " . $_SERVER['PHP_SELF']);
    exit();
}

// Recupera mensagens da sessão
if (isset($_SESSION['mensagem'])) {
    $mensagem = $_SESSION['mensagem'];
    $tipo_mensagem = $_SESSION['tipo_mensagem'];
    // Limpa as mensagens da sessão
    unset($_SESSION['mensagem']);
    unset($_SESSION['tipo_mensagem']);
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cadastro - Bot WhatsApp</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card shadow">
                    <div class="card-body">
                        <h2 class="text-center mb-4">Cadastro - Bot WhatsApp</h2>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>Importante:</strong> Use seu número de WhatsApp com DDD. 
                            Exemplo: (11) 99999-9999
                        </div>
                        
                        <?php if ($mensagem): ?>
                        <div class="alert alert-<?php echo $tipo_mensagem; ?>">
                            <?php echo $mensagem; ?>
                            <?php if ($tipo_mensagem === "success"): ?>
                            <div class="mt-3">
                                <p><strong>Agora você pode usar o bot!</strong></p>
                                <p>Clique no botão abaixo para iniciar uma conversa:</p>
                                <a href="https://wa.me/<?php echo $numero_bot; ?>?text=Oi" target="_blank" 
                                   class="btn btn-success w-100">
                                    <i class="fab fa-whatsapp"></i> Iniciar Conversa no WhatsApp
                                </a>
                            </div>
                            <?php endif; ?>
                        </div>
                        <?php endif; ?>

                        <form method="POST" action="" onsubmit="return validarFormulario()">
                            <div class="mb-3">
                                <label for="nome" class="form-label">Nome Completo</label>
                                <input type="text" class="form-control" id="nome" name="nome" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="telefone" class="form-label">WhatsApp (com DDD)</label>
                                <input type="tel" class="form-control" id="telefone" name="telefone" 
                                       placeholder="(11) 99999-9999" required>
                                <div class="form-text">Digite seu número de WhatsApp com DDD</div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="email" class="form-label">E-mail</label>
                                <input type="email" class="form-control" id="email" name="email" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="senha" class="form-label">Senha</label>
                                <input type="password" class="form-control" id="senha" name="senha" 
                                       minlength="6" required>
                                <div class="form-text">Mínimo 6 caracteres</div>
                            </div>
                            
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="fas fa-user-plus"></i> Cadastrar
                            </button>
                        </form>
                        
                        <div class="mt-4 text-center">
                            <small class="text-muted">
                                Após o cadastro, você poderá usar todos os recursos do bot de agendamento!
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.mask/1.14.16/jquery.mask.min.js"></script>

    <script>
        $(document).ready(function() {
            $('#telefone').mask('(00) 00000-0000');
        });

        function validarFormulario() { 
            const nome = document.getElementById('nome').value;
            const telefone = document.getElementById('telefone').value;
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;

            if (!nome || !telefone || !email || !senha) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return false;
            }

            // Validar formato do telefone
            const telefoneNumerico = telefone.replace(/\D/g, '');
            if (telefoneNumerico.length !== 11) {
                alert('Por favor, insira um número de telefone válido com DDD (11 dígitos).');
                return false;
            }

            // Validar DDD
            const ddd = parseInt(telefoneNumerico.substring(0, 2));
            const dddsValidos = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 
            28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 
            53, 54, 55, 61, 62, 64, 63, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 
            82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];
            
            if (!dddsValidos.includes(ddd)) {
                alert('Por favor, insira um DDD válido.');
                return false;
            }

            // Validar se é celular (9 na terceira posição)
            if (telefoneNumerico.charAt(2) !== '9') {
                alert('Por favor, insira um número de celular válido (deve começar com 9 após o DDD).');
                return false;
            }

            if (senha.length < 6) {
                alert('A senha deve ter pelo menos 6 caracteres.');
                return false;
            }

            return true;
        }
    </script>
</body>
</html>
