import {
    salvarCompromisso,
    buscarCompromissosHoje,
    buscarCompromissosAmanha,
    buscarProximosCompromissos,
    buscarCompromissosPorRecorrencia,
    excluirCompromisso,
    atualizarCompromisso
} from "../database/repository.js"
import { processarData, processarHorario, normalizarTexto } from "../utils/utils.js"
import { enviarMenuOpcoes } from "../services/whatsapp.js"

export const conversationStates = new Map()

export function limparEstadoConversa(telefone) {
    const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "").slice(-11)
    conversationStates.delete(numeroLimpo)
    console.log(`🗑️ Estado da conversa limpo para: ${numeroLimpo}`)
}

export async function processarFluxoAgendamento(client, telefone, mensagem, estado) {
    const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "").slice(-11)

    try {
        switch (estado.step) {
            case "aguardando_assunto":
                estado.data.assunto = mensagem
                estado.step = "aguardando_data"
                conversationStates.set(numeroLimpo, estado)
                await client.sendMessage(telefone, "Perfeito! Agora me diga qual a data do compromisso?\n\nExemplos: 25/12, 25-12, 25/12/2024")
                break

            case "aguardando_data":
                const dataFormatada = processarData(mensagem)
                if (!dataFormatada) {
                    await client.sendMessage(telefone, "Data inválida! ❌\nPor favor, use: 25/12, 25-12 ou 25/12/2024")
                    return
                }
                estado.data.data = dataFormatada
                estado.step = "aguardando_horario"
                conversationStates.set(numeroLimpo, estado)
                await client.sendMessage(telefone, "Ótimo! Agora me diga qual o horário?\nExemplos: 15h30, 15:30, 1530")
                break

            case "aguardando_horario":
                const horaFormatada = processarHorario(mensagem)
                if (!horaFormatada) {
                    await client.sendMessage(telefone, "Horário inválido! ❌\nPor favor, use: 15h30, 15:30 ou 1530")
                    return
                }
                estado.data.hora = horaFormatada
                estado.step = "aguardando_recorrencia"
                conversationStates.set(numeroLimpo, estado)
                await client.sendMessage(telefone, "Confirmado! ✅\n\nAgora escolha a frequência:\n1️⃣ - Único\n2️⃣ - Diário\n3️⃣ - Semanal\n4️⃣ - Mensal")
                break

            case "aguardando_recorrencia":
                const opcoes = { "1": "unico", "2": "diario", "3": "semanal", "4": "mensal" }
                const recorrencia = opcoes[mensagem]
                if (!recorrencia) {
                    await client.sendMessage(telefone, "Opção inválida! Escolha de 1 a 4.")
                    return
                }
                const sucesso = await salvarCompromisso(telefone, estado.nome, estado.data.assunto, estado.data.data, estado.data.hora, recorrencia)
                limparEstadoConversa(telefone)
                if (sucesso) {
                    await client.sendMessage(telefone, "✅ Compromisso agendado com sucesso!")
                } else {
                    await client.sendMessage(telefone, "❌ Erro ao salvar. Tente novamente.")
                }
                await enviarMenuOpcoes(client, telefone, estado.nome)
                break

            // ... Mais cases podem ser extraídos aqui (edição, exclusão) para manter este arquivo limpo
            default:
                limparEstadoConversa(telefone)
                await enviarMenuOpcoes(client, telefone, estado.nome)
        }
    } catch (error) {
        console.error("❌ Erro no fluxo:", error.message)
        limparEstadoConversa(telefone)
        await client.sendMessage(telefone, "Ocorreu um erro. Vamos recomeçar.")
        await enviarMenuOpcoes(client, telefone, estado.nome)
    }
}
