import { initWhatsApp } from "./services/whatsapp.js"
import { startScheduler } from "./services/scheduler.js"
import { handleMessage } from "./handlers/messageHandler.js"

// Ponto de entrada da aplicação
async function main() {
    console.log("🚀 Iniciando Bot de Agendamento...")

    // Inicializa o cliente WhatsApp
    const client = initWhatsApp()

    // Configura os ouvintes de eventos
    client.on("message", async (message) => {
        await handleMessage(client, message)
    })

    // Inicializa o cliente
    await client.initialize()

    // Inicia o agendador de lembretes
    startScheduler(client)
}

main().catch(err => {
    console.error("❌ Falha crítica na inicialização:", err)
})
