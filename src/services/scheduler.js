import cron from "node-cron"
import {
    buscarCompromissosParaLembrete,
    marcarLembreteEnviado,
    resetarLembreteRecorrente
} from "../database/repository.js"

export function startScheduler(client) {
    cron.schedule("* * * * *", async () => {
        try {
            const compromissos = await buscarCompromissosParaLembrete()

            for (const compromisso of compromissos) {
                const horaCompromisso = compromisso.hora_compromisso.substring(0, 5)
                const [horaAgendada, minutoAgendado] = horaCompromisso.split(":").map(Number)

                const agora = new Date()
                const horaAtual = agora.getHours()
                const minutoAtual = agora.getMinutes()

                const diferencaMinutos = horaAgendada * 60 + minutoAgendado - (horaAtual * 60 + minutoAtual)

                const telefoneFormatado = compromisso.telefone.includes("@c.us")
                    ? compromisso.telefone
                    : `${compromisso.telefone}@c.us`

                if (diferencaMinutos <= 60 && diferencaMinutos > 0) {
                    const mensagem = `🔔 LEMBRETE!\n\nVocê tem um compromisso em ${diferencaMinutos} minutos:\n\n📋 ${compromisso.assunto}\n⏰ ${horaCompromisso}`
                    await client.sendMessage(telefoneFormatado, mensagem)
                    await marcarLembreteEnviado(compromisso.id)
                    console.log(`✅ Lembrete enviado para ${telefoneFormatado} - Compromisso: ${compromisso.assunto}`)

                    if (compromisso.recorrencia !== 'unico') {
                        setTimeout(async () => {
                            await resetarLembreteRecorrente(compromisso.id)
                        }, 5000)
                    }
                } else if (diferencaMinutos <= 0 && diferencaMinutos >= -5) {
                    const mensagem = `⚠️ ATENÇÃO!\n\nVocê tem um compromisso agendado para agora:\n\n📋 ${compromisso.assunto}\n⏰ ${horaCompromisso}`
                    await client.sendMessage(telefoneFormatado, mensagem)
                    await marcarLembreteEnviado(compromisso.id)
                    console.log(`✅ Lembrete atrasado enviado para ${telefoneFormatado} - Compromisso: ${compromisso.assunto}`)

                    if (compromisso.recorrencia !== 'unico') {
                        setTimeout(async () => {
                            await resetarLembreteRecorrente(compromisso.id)
                        }, 5000)
                    }
                }
            }
        } catch (error) {
            console.error("❌ Erro ao enviar lembretes:", error.message)
        }
    })
}
