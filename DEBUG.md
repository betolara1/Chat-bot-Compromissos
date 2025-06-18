# Debug do WhatsApp Bot

## Passos para identificar o problema:

### 1. Verifique os logs no terminal
Quando você enviar uma mensagem, deve aparecer:
\`\`\`
=== EVENTO MESSAGE DISPARADO ===
From: 5551829332170@c.us
Body: teste
Type: chat
FromMe: true
Timestamp: 1234567890
================================
\`\`\`

### 2. Se não aparecer nada:
- O evento `message` não está sendo disparado
- Problema com a biblioteca whatsapp-web.js
- Sessão do WhatsApp pode estar corrompida

### 3. Se aparecer mas não responder:
- Erro na função `sendMessage`
- Problema de permissões
- Número de telefone inválido

### 4. Comandos de teste:
- `teste` - resposta simples
- `agendar` - inicia agendamento
- `compromissos hoje` - lista compromissos

## Soluções alternativas:

### Opção 1: Limpar sessão
1. Pare o bot (Ctrl+C)
2. Delete a pasta `.wwebjs_auth`
3. Reinicie o bot
4. Escaneie o QR code novamente

### Opção 2: Usar outro número
- WhatsApp Business
- Segundo chip
- Número de outra pessoa

### Opção 3: Telegram Bot
Se o WhatsApp não funcionar, posso criar a mesma funcionalidade no Telegram, que é mais fácil de configurar.
