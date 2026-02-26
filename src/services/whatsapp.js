import pkg from "whatsapp-web.js"
const { Client, LocalAuth } = pkg
import qrcode from "qrcode-terminal"

export function initWhatsApp() {
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            args: ["--no-sandbox"],
        },
    })

    client.on("qr", (qr) => {
        console.log("📱 QR RECEBIDO, escaneie com o WhatsApp:")
        qrcode.generate(qr, { small: true })
    })

    client.on("ready", () => {
        console.log("✅ Cliente WhatsApp conectado!")
        console.log("🚀 Bot WhatsApp iniciado!")
    })

    return client
}

export async function enviarMenuOpcoes(client, telefone, nome) {
    try {
        await client.sendMessage(
            telefone,
            `Olá ${nome}! 👋\n\nComandos disponíveis:\n• AGENDAR - Para criar um novo compromisso\n• EDITAR - Para editar compromissos\n• EXCLUIR - Para excluir compromissos\n• CALENDARIO - Para acessar o calendário\n• HOJE - Para ver compromissos de hoje\n• AMANHÃ - Para ver compromissos de amanhã\n• PROXIMOS - Para ver todos os próximos compromissos\n\nA qualquer momento, digite SAIR para cancelar a operação atual.`
        )
    } catch (error) {
        console.error("❌ Erro ao enviar menu:", error.message)
    }
}
