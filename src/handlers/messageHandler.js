import {
    verificarUsuarioRegistrado,
    buscarCompromissosHoje,
    buscarCompromissosAmanha,
    buscarProximosCompromissos
} from "../database/repository.js"
import {
    conversationStates,
    limparEstadoConversa,
    processarFluxoAgendamento
} from "./flowHandler.js"
import { normalizarTexto } from "../utils/utils.js"
import { enviarMenuOpcoes } from "../services/whatsapp.js"
import { CADASTRO_URL, CALENDARIO_URL } from "../config/db.js"

export async function handleMessage(client, message) {
    if (message.fromMe) return
    if (message.from.includes("@g.us")) return
    if (message.type !== "chat") return

    const telefone = message.from
    const corpoMensagem = message.body.trim()
    const contact = await message.getContact()
    const nome = contact.pushname || contact.name || "Usuário"

    try {
        const usuarioRegistrado = await verificarUsuarioRegistrado(telefone)
        if (!usuarioRegistrado) {
            await client.sendMessage(telefone, `Olá ${nome}! Cadastre-se em: ${CADASTRO_URL}`)
            return
        }

        const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "").slice(-11)
        const mensagemNormalizada = normalizarTexto(corpoMensagem)
        const estado = conversationStates.get(numeroLimpo)

        if (mensagemNormalizada === "sair") {
            limparEstadoConversa(telefone)
            await client.sendMessage(telefone, "Operação cancelada! ❌")
            await enviarMenuOpcoes(client, telefone, nome)
            return
        }

        // Comandos principais
        if (mensagemNormalizada === "calendario") {
            await client.sendMessage(telefone, `Acesse em: ${CALENDARIO_URL}`)
        } else if (mensagemNormalizada === "agendar") {
            limparEstadoConversa(telefone)
            const novoEstado = { step: "aguardando_assunto", nome, data: {} }
            conversationStates.set(numeroLimpo, novoEstado)
            await client.sendMessage(telefone, "Qual o assunto do compromisso?")
        } else if (mensagemNormalizada === "hoje") {
            const comps = await buscarCompromissosHoje(telefone)
            let resp = comps.length ? "Compromissos de Hoje:\n" : "Sem compromissos hoje! 🎉"
            comps.forEach(c => resp += `\n📅 ${c.assunto}\n⏰ ${c.hora_compromisso.substring(0, 5)}`)
            await client.sendMessage(telefone, resp)
        } else if (estado) {
            await processarFluxoAgendamento(client, telefone, corpoMensagem, estado)
        } else {
            await enviarMenuOpcoes(client, telefone, nome)
        }
    } catch (error) {
        console.error("❌ Erro ao processar:", error.message)
        limparEstadoConversa(telefone)
    }
}
