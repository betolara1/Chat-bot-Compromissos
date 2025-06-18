# WhatsApp Scheduler Bot (Não Oficial)

Bot para WhatsApp que permite agendar compromissos e receber lembretes automáticos usando a biblioteca não oficial whatsapp-web.js.

## ⚠️ Aviso Importante

Esta solução usa uma biblioteca não oficial que automatiza o WhatsApp Web. Isso:

- **Não é aprovado pelo WhatsApp/Meta**
- **Pode violar os termos de serviço do WhatsApp**
- **Pode resultar no banimento do número de telefone usado**
- **Pode parar de funcionar se o WhatsApp atualizar sua plataforma**

Use por sua conta e risco, apenas para fins pessoais ou de teste.

## Funcionalidades

- **AGENDAR**: Criar novos compromissos através de conversa interativa
- **COMPROMISSOS HOJE**: Listar todos os compromissos do dia atual
- **Lembretes automáticos**: Notificações 1 hora antes de cada compromisso

## Requisitos

- Node.js 14+
- MySQL
- Um smartphone com WhatsApp instalado

## Configuração

### 1. Banco de dados MySQL

1. Instale o MySQL
2. Execute o script `scripts/create_database.sql`
3. Configure as credenciais no arquivo `.env`

### 2. Variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

\`\`\`env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=whatsapp_scheduler
\`\`\`

### 3. Instalação

\`\`\`bash
npm install
npm start
\`\`\`

### 4. Autenticação

Ao iniciar o bot, um QR code será exibido no terminal. Escaneie este QR code com o WhatsApp do seu smartphone:

1. Abra o WhatsApp no seu smartphone
2. Toque em Menu (⋮) ou Configurações
3. Selecione WhatsApp Web/Desktop
4. Aponte a câmera para o QR code no terminal

## Como usar

1. Envie **AGENDAR** para iniciar um novo agendamento
2. Siga as instruções do bot para informar:
   - Assunto do compromisso
   - Data (formato DD/MM)
   - Horário (formato HH:MM ou HHhMM)

3. Envie **COMPROMISSOS HOJE** para ver seus compromissos do dia

## Considerações técnicas

- O bot requer uma sessão ativa do WhatsApp Web
- Para uso em servidor, considere usar um navegador headless como o Puppeteer
- A sessão precisa ser mantida ativa para o funcionamento contínuo do bot
