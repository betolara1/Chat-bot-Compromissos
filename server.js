import pkg from "whatsapp-web.js"
const { Client, LocalAuth } = pkg
import qrcode from "qrcode-terminal"
import mysql from "mysql2/promise"
import cron from "node-cron"
import dotenv from "dotenv"
import { processarHorario, normalizarTexto, processarData } from "./utils.js"

dotenv.config()

// Configuração do MySQL
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "admin-bot",
  password: process.env.DB_PASSWORD || "FY4N6wd7prJksVvIPnbS",
  database: process.env.DB_NAME || "whatsapp-scheduler",
}

// URLs do sistema
const CADASTRO_URL = "https://bot-whatsapp.jsatecsistemas.com.br/agenda_whats.php"
const CALENDARIO_URL = "https://bot-whatsapp.jsatecsistemas.com.br/calendario.php"

// Estados da conversa
const conversationStates = new Map()

// Função para limpar estado da conversa
function limparEstadoConversa(telefone) {
  const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "").slice(-11)
  conversationStates.delete(numeroLimpo)
  console.log(`🗑️ Estado da conversa limpo para: ${numeroLimpo}`)
}

// Inicializar cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox"],
  },
})

// Função para conectar ao banco
async function connectDB() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    console.log("✅ Conexão com banco estabelecida")
    return connection
  } catch (error) {
    console.error("❌ Erro ao conectar ao banco:", error.message)
    throw error
  }
}

// Função para verificar se usuário está registrado
async function verificarUsuarioRegistrado(telefone) {
  const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "")

  console.log("=== DEBUG VERIFICAÇÃO USUÁRIO ===")
  console.log("Número original:", telefone)
  console.log("Número limpo:", numeroLimpo)

  let connection = null
  let rows = []

  try {
    connection = await connectDB()

    // Tentativa 1: Busca pelo número completo
    rows = await connection.execute("SELECT * FROM usuarios WHERE telefone = ?", [numeroLimpo])
    console.log("Tentativa 1 - Número completo:", numeroLimpo, "- Resultados:", rows[0].length)

    // Tentativa 2: Busca pelos últimos 10 dígitos
    if (rows[0].length === 0 && numeroLimpo.length >= 10) {
      const ultimosDezDigitos = numeroLimpo.slice(-10)
      console.log("Tentativa 2 - Últimos 10 dígitos:", ultimosDezDigitos)
      rows = await connection.execute("SELECT * FROM usuarios WHERE telefone LIKE ?", [`%${ultimosDezDigitos}`])
      console.log("Resultados tentativa 2:", rows[0].length)
    }

    // Tentativa 3: Busca pelos últimos 8 dígitos
    if (rows[0].length === 0 && numeroLimpo.length >= 8) {
      const ultimosOitoDigitos = numeroLimpo.slice(-8)
      console.log("Tentativa 3 - Últimos 8 dígitos:", ultimosOitoDigitos)
      rows = await connection.execute("SELECT * FROM usuarios WHERE telefone LIKE ?", [`%${ultimosOitoDigitos}`])
      console.log("Resultados tentativa 3:", rows[0].length)
    }

    // Tentativa 4: Adicionar 9 após DDD
    if (rows[0].length === 0 && numeroLimpo.length === 10) {
      const ddd = numeroLimpo.substring(0, 2)
      const restante = numeroLimpo.substring(2)
      const numeroComNove = `${ddd}9${restante}`
      console.log("Tentativa 4 - Adicionando 9 após DDD:", numeroComNove)
      rows = await connection.execute("SELECT * FROM usuarios WHERE telefone = ?", [numeroComNove])
      console.log("Resultados tentativa 4:", rows[0].length)
    }

    // Tentativa 5: Remover 9 após DDD
    if (rows[0].length === 0 && numeroLimpo.length === 11) {
      const ddd = numeroLimpo.substring(0, 2)
      const restante = numeroLimpo.substring(3)
      const numeroSemNove = `${ddd}${restante}`
      console.log("Tentativa 5 - Removendo 9 após DDD:", numeroSemNove)
      rows = await connection.execute("SELECT * FROM usuarios WHERE telefone = ?", [numeroSemNove])
      console.log("Resultados tentativa 5:", rows[0].length)
    }

    const registrado = rows[0].length > 0
    console.log("✅ Usuário registrado?", registrado)

    if (registrado) {
      console.log("📱 Encontrado com telefone:", rows[0][0].telefone)
      console.log("👤 Nome:", rows[0][0].nome)
    }

    return registrado
  } catch (error) {
    console.error("❌ Erro ao verificar usuário:", error.message)
    return false
  } finally {
    if (connection) {
      try {
        await connection.end()
        console.log("🔐 Conexão com banco fechada")
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Função para obter ID do usuário pelo telefone
async function obterIdUsuario(telefone) {
  const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "")
  let connection = null
  let rows = []

  try {
    connection = await connectDB()

    // Mesma lógica de busca da função verificarUsuarioRegistrado
    rows = await connection.execute("SELECT id FROM usuarios WHERE telefone = ?", [numeroLimpo])

    if (rows[0].length === 0 && numeroLimpo.length >= 10) {
      const ultimosDezDigitos = numeroLimpo.slice(-10)
      rows = await connection.execute("SELECT id FROM usuarios WHERE telefone LIKE ?", [`%${ultimosDezDigitos}`])
    }

    if (rows[0].length === 0 && numeroLimpo.length >= 8) {
      const ultimosOitoDigitos = numeroLimpo.slice(-8)
      rows = await connection.execute("SELECT id FROM usuarios WHERE telefone LIKE ?", [`%${ultimosOitoDigitos}`])
    }

    if (rows[0].length === 0 && numeroLimpo.length === 10) {
      const ddd = numeroLimpo.substring(0, 2)
      const restante = numeroLimpo.substring(2)
      const numeroComNove = `${ddd}9${restante}`
      rows = await connection.execute("SELECT id FROM usuarios WHERE telefone = ?", [numeroComNove])
    }

    if (rows[0].length === 0 && numeroLimpo.length === 11) {
      const ddd = numeroLimpo.substring(0, 2)
      const restante = numeroLimpo.substring(3)
      const numeroSemNove = `${ddd}${restante}`
      rows = await connection.execute("SELECT id FROM usuarios WHERE telefone = ?", [numeroSemNove])
    }

    if (rows[0].length > 0) {
      const idUsuario = rows[0][0].id
      console.log(`✅ ID do usuário encontrado: ${idUsuario}`)
      return idUsuario
    } else {
      console.log(`❌ Usuário não encontrado para telefone: ${numeroLimpo}`)
      return null
    }
  } catch (error) {
    console.error("❌ Erro ao obter ID do usuário:", error.message)
    return null
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Função para salvar compromisso
async function salvarCompromisso(telefone, nome, assunto, data, hora, recorrencia) {
  const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "")
  let connection = null

  console.log("💾 Salvando compromisso para:", numeroLimpo)

  try {
    const idUsuario = await obterIdUsuario(telefone)

    if (!idUsuario) {
      console.error("❌ Usuário não encontrado para salvar compromisso")
      return false
    }

    connection = await connectDB()

    await connection.execute(
      "INSERT INTO compromissos (id_usuario, assunto, data_compromisso, hora_compromisso, recorrencia) VALUES (?, ?, ?, ?, ?)",
      [idUsuario, assunto, data, hora, recorrencia || "unico"],
    )

    console.log("✅ Compromisso salvo com sucesso!")
    console.log(`📅 Data: ${data}`)
    console.log(`⏰ Hora: ${hora}`)
    console.log(`📝 Assunto: ${assunto}`)
    console.log(`🔄 Recorrência: ${recorrencia}`)

    return true
  } catch (error) {
    console.error("❌ Erro ao salvar compromisso:", error.message)
    return false
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Função genérica para buscar compromissos
async function buscarCompromissos(telefone, tipo) {
  const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "")
  let connection = null
  let rows = []

  try {
    const idUsuario = await obterIdUsuario(telefone)

    if (!idUsuario) {
      console.error("❌ Usuário não encontrado para buscar compromissos")
      return []
    }

    connection = await connectDB()
    let query = ""
    let params = []

    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, "0")
    const dia = String(hoje.getDate()).padStart(2, "0")
    const dataHoje = `${ano}-${mes}-${dia}`

    const amanha = new Date(hoje)
    amanha.setDate(amanha.getDate() + 1)
    const anoAmanha = amanha.getFullYear()
    const mesAmanha = String(amanha.getMonth() + 1).padStart(2, "0")
    const diaAmanha = String(amanha.getDate()).padStart(2, "0")
    const dataAmanha = `${anoAmanha}-${mesAmanha}-${diaAmanha}`

    switch (tipo) {
      case "hoje":
        query =
          "SELECT * FROM compromissos WHERE id_usuario = ? AND DATE(data_compromisso) = ? ORDER BY hora_compromisso"
        params = [idUsuario, dataHoje]
        break
      case "amanha":
        query =
          "SELECT * FROM compromissos WHERE id_usuario = ? AND DATE(data_compromisso) = ? ORDER BY hora_compromisso"
        params = [idUsuario, dataAmanha]
        break
      case "proximos":
        query =
          "SELECT * FROM compromissos WHERE id_usuario = ? AND data_compromisso >= ? ORDER BY data_compromisso, hora_compromisso LIMIT 10"
        params = [idUsuario, dataHoje]
        break
      default:
        query = "SELECT * FROM compromissos WHERE id_usuario = ? ORDER BY data_compromisso, hora_compromisso"
        params = [idUsuario]
    }
    ;[rows] = await connection.execute(query, params)
    console.log(`✅ Encontrados ${rows.length} compromissos para ${tipo}`)
    return rows
  } catch (error) {
    console.error(`❌ Erro ao buscar compromissos ${tipo}:`, error.message)
    return []
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Funções específicas
async function buscarCompromissosHoje(telefone) {
  return await buscarCompromissos(telefone, "hoje")
}

async function buscarCompromissosAmanha(telefone) {
  return await buscarCompromissos(telefone, "amanha")
}

async function buscarProximosCompromissos(telefone) {
  return await buscarCompromissos(telefone, "proximos")
}

// Função para buscar compromissos para lembretes
async function buscarCompromissosParaLembrete() {
  let connection = null

  try {
    connection = await connectDB()
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, "0")
    const dia = String(hoje.getDate()).padStart(2, "0")
    const dataHoje = `${ano}-${mes}-${dia}`

    const [rows] = await connection.execute(
      "SELECT c.*, u.telefone FROM compromissos c JOIN usuarios u ON c.id_usuario = u.id WHERE DATE(c.data_compromisso) = ? AND c.lembrete_enviado = FALSE ORDER BY c.hora_compromisso",
      [dataHoje],
    )

    console.log(`📅 Encontrados ${rows.length} compromissos para enviar lembretes`)
    return rows
  } catch (error) {
    console.error("❌ Erro ao buscar lembretes:", error.message)
    return []
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Função para marcar lembrete como enviado
async function marcarLembreteEnviado(id) {
  let connection = null

  try {
    connection = await connectDB()
    await connection.execute("UPDATE compromissos SET lembrete_enviado = TRUE WHERE id = ?", [id])
    console.log(`✅ Lembrete marcado como enviado para compromisso ID: ${id}`)
    return true
  } catch (error) {
    console.error("❌ Erro ao marcar lembrete como enviado:", error.message)
    return false
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Funções utilitárias movidas para utils.js


// Função para enviar menu de opções
async function enviarMenuOpcoes(telefone, nome) {
  try {
    await client.sendMessage(
      telefone,
      `Olá ${nome}! 👋\n\nComandos disponíveis:\n• AGENDAR - Para criar um novo compromisso\n• EDITAR - Para editar compromissos\n• EXCLUIR - Para excluir compromissos\n• CALENDARIO - Para acessar o calendário\n• HOJE - Para ver compromissos de hoje\n• AMANHÃ - Para ver compromissos de amanhã\n• PROXIMOS - Para ver todos os próximos compromissos\n\nA qualquer momento, digite SAIR para cancelar a operação atual.`
    )
  } catch (error) {
    console.error("❌ Erro ao enviar menu:", error.message)
  }
}

// Função para buscar compromissos por recorrência
async function buscarCompromissosPorRecorrencia(telefone, recorrencia) {
  let connection = null
  let rows = []

  try {
    const idUsuario = await obterIdUsuario(telefone)

    if (!idUsuario) {
      console.error("❌ Usuário não encontrado para buscar compromissos")
      return []
    }

    connection = await connectDB()
    let query = ""
    let params = []

    if (recorrencia === "todas") {
      query = "SELECT * FROM compromissos WHERE id_usuario = ? ORDER BY data_compromisso, hora_compromisso"
      params = [idUsuario]
    } else {
      query = "SELECT * FROM compromissos WHERE id_usuario = ? AND recorrencia = ? ORDER BY data_compromisso, hora_compromisso"
      params = [idUsuario, recorrencia]
    }

    ;[rows] = await connection.execute(query, params)
    console.log(`✅ Encontrados ${rows.length} compromissos com recorrência ${recorrencia}`)
    return rows
  } catch (error) {
    console.error(`❌ Erro ao buscar compromissos por recorrência:`, error.message)
    return []
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Função para excluir compromisso por ID
async function excluirCompromisso(id) {
  let connection = null

  try {
    connection = await connectDB()
    await connection.execute("DELETE FROM compromissos WHERE id = ?", [id])
    console.log(`✅ Compromisso ID ${id} excluído com sucesso`)
    return true
  } catch (error) {
    console.error("❌ Erro ao excluir compromisso:", error.message)
    return false
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Função para atualizar compromisso
async function atualizarCompromisso(id, campo, valor) {
  let connection = null

  try {
    connection = await connectDB()
    const campos = {
      nome: "assunto",
      data: "data_compromisso",
      horario: "hora_compromisso",
      recorrencia: "recorrencia"
    }

    const campoSQL = campos[campo]
    if (!campoSQL) {
      console.error(`❌ Campo inválido para atualização: ${campo}`)
      return false
    }

    await connection.execute(
      `UPDATE compromissos SET ${campoSQL} = ? WHERE id = ?`,
      [valor, id]
    )
    console.log(`✅ Compromisso ID ${id} atualizado com sucesso - ${campoSQL} = ${valor}`)
    return true
  } catch (error) {
    console.error("❌ Erro ao atualizar compromisso:", error.message)
    return false
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Função principal para processar mensagens
async function processarMensagem(telefone, mensagem, nome) {
  console.log(`\n=== PROCESSANDO MENSAGEM ===`)
  console.log(`Telefone: ${telefone}`)
  console.log(`Nome: ${nome}`)
  console.log(`Mensagem: ${mensagem}`)

  try {
    const usuarioRegistrado = await verificarUsuarioRegistrado(telefone)

    if (!usuarioRegistrado) {
      console.log("❌ Usuário não registrado")
      await client.sendMessage(
        telefone,
        `Olá ${nome}! Para utilizar o bot de agendamento, você precisa se cadastrar primeiro.\n\nAcesse: ${CADASTRO_URL}\n\nApós o cadastro, você poderá utilizar todas as funcionalidades do bot! 😊`
      )
      return
    }

    console.log("✅ Usuário registrado - processando comando")

    const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "").slice(-11)
    console.log(`📱 Número limpo para estado: ${numeroLimpo}`)

    const mensagemNormalizada = normalizarTexto(mensagem)
    const estado = conversationStates.get(numeroLimpo)

    console.log(`🔍 Estado atual:`, estado)
    console.log(`📝 Mensagem normalizada: ${mensagemNormalizada}`)

    // Verifica se o usuário quer sair da operação atual
    if (mensagemNormalizada === "sair") {
      if (estado) {
        limparEstadoConversa(telefone)
        console.log(`🚪 Usuário saiu da operação`)
        await client.sendMessage(telefone, "Operação cancelada! ❌")
        await enviarMenuOpcoes(telefone, nome)
        return
      }
    }

    // Comandos principais - sempre limpam o estado antes de executar
    if (mensagemNormalizada === "calendario") {
      limparEstadoConversa(telefone)
      console.log(`📅 Enviando link do calendário`)
      await client.sendMessage(telefone, `Acesse o calendário em: ${CALENDARIO_URL}`)
    } else if (mensagemNormalizada === "agendar") {
      limparEstadoConversa(telefone)
      console.log(`📝 Iniciando processo de agendamento`)
      const novoEstado = {
        step: "aguardando_assunto",
        nome: nome,
        data: {},
      }

      conversationStates.set(numeroLimpo, novoEstado)
      console.log(`✅ Estado criado:`, novoEstado)

      await client.sendMessage(
        telefone,
        `Ok ${nome}, qual o assunto da Reunião/Tarefa que deseja registrar?\n\nDigite SAIR a qualquer momento para cancelar.`
      )
    } else if (mensagemNormalizada === "hoje") {
      limparEstadoConversa(telefone)
      console.log(`📅 Buscando compromissos de hoje`)
      const compromissos = await buscarCompromissosHoje(telefone)

      if (compromissos.length === 0) {
        await client.sendMessage(telefone, "Você não tem compromissos para hoje! 🎉")
      } else {
        let resposta = "Compromissos para Hoje:\n\n"
        compromissos.forEach((compromisso) => {
          resposta += `📅 ${compromisso.assunto}\n⏰ ${compromisso.hora_compromisso.substring(0, 5)}\n\n`
        })
        await client.sendMessage(telefone, resposta)
      }
    } else if (mensagemNormalizada === "amanha" || mensagemNormalizada === "amanhã") {
      limparEstadoConversa(telefone)
      console.log(`📅 Buscando compromissos de amanhã`)
      const compromissos = await buscarCompromissosAmanha(telefone)

      if (compromissos.length === 0) {
        await client.sendMessage(telefone, "Você não tem compromissos para amanhã! 🎉")
      } else {
        let resposta = "Compromissos para Amanhã:\n\n"
        compromissos.forEach((compromisso) => {
          resposta += `📅 ${compromisso.assunto}\n⏰ ${compromisso.hora_compromisso.substring(0, 5)}\n\n`
        })
        await client.sendMessage(telefone, resposta)
      }
    } else if (mensagemNormalizada === "proximos" || mensagemNormalizada === "próximos") {
      limparEstadoConversa(telefone)
      console.log(`📅 Buscando próximos compromissos`)
      const compromissos = await buscarProximosCompromissos(telefone)

      if (compromissos.length === 0) {
        await client.sendMessage(telefone, "Você não tem próximos compromissos agendados! 🎉")
      } else {
        let resposta = "Próximos Compromissos:\n\n"
        compromissos.forEach((compromisso) => {
          const data = new Date(compromisso.data_compromisso).toLocaleDateString("pt-BR")
          resposta += `📅 ${data}\n⏰ ${compromisso.hora_compromisso.substring(0, 5)}\n📝 ${compromisso.assunto}\n\n`
        })
        await client.sendMessage(telefone, resposta)
      }
    } else if (mensagemNormalizada === "excluir") {
      limparEstadoConversa(telefone)
      console.log(`🗑️ Iniciando processo de exclusão`)
      const novoEstado = {
        step: "aguardando_recorrencia_exclusao",
        nome: nome,
        data: {},
      }

      conversationStates.set(numeroLimpo, novoEstado)
      console.log(`✅ Estado criado:`, novoEstado)

      await client.sendMessage(
        telefone,
        `Escolha a recorrência dos compromissos que deseja visualizar para excluir:\n\n1️⃣ - Diário\n2️⃣ - Semanal\n3️⃣ - Mensal\n4️⃣ - Todas\n\nDigite o número da opção desejada ou SAIR para cancelar.`
      )
    } else if (mensagemNormalizada === "editar") {
      limparEstadoConversa(telefone)
      console.log(`✏️ Iniciando processo de edição`)
      const novoEstado = {
        step: "aguardando_recorrencia_edicao",
        nome: nome,
        data: {},
      }

      conversationStates.set(numeroLimpo, novoEstado)
      console.log(`✅ Estado criado:`, novoEstado)

      await client.sendMessage(
        telefone,
        `Escolha a recorrência dos compromissos que deseja visualizar para editar:\n\n1️⃣ - Único\n2️⃣ - Diário\n3️⃣ - Semanal\n4️⃣ - Mensal\n5️⃣ - Todas\n\nDigite o número da opção desejada ou SAIR para cancelar.`
      )
    } else if (estado) {
      // Se existe um estado, processa o fluxo de agendamento
      console.log(`🔄 Processando fluxo de agendamento com estado:`, estado)
      await processarFluxoAgendamento(telefone, mensagem, estado)
    } else {
      // Se não há estado e a mensagem não é um comando válido, envia o menu
      console.log(`📋 Mensagem não é um comando válido ou não há estado ativo, enviando menu de opções`)
      await enviarMenuOpcoes(telefone, nome)
    }
  } catch (error) {
    console.error("❌ Erro ao processar mensagem:", error.message)
    console.error("Stack trace:", error.stack)
    limparEstadoConversa(telefone)
    try {
      await client.sendMessage(telefone, "Desculpe, ocorreu um erro. Tente novamente.")
      setTimeout(async () => {
        await enviarMenuOpcoes(telefone, nome)
      }, 1000)
    } catch (sendError) {
      console.error("❌ Erro ao enviar mensagem de erro:", sendError.message)
    }
  }
}

// Função para processar o fluxo de agendamento
async function processarFluxoAgendamento(telefone, mensagem, estado) {
  console.log(`\n🔄 === PROCESSANDO FLUXO DE AGENDAMENTO ===`)
  console.log(`📱 Telefone:`, telefone)
  console.log(`👤 Nome:`, estado.nome)
  console.log(`📝 Mensagem recebida:`, mensagem)
  console.log(`🔍 Estado atual:`, estado.step)
  console.log(`💾 Dados atuais:`, estado.data)

  const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "").slice(-11)

  try {
    switch (estado.step) {
      case "aguardando_assunto":
        console.log(`\n📝 === PROCESSANDO ASSUNTO ===`)
        console.log(`📥 Assunto recebido: "${mensagem}"`)

        estado.data.assunto = mensagem
        estado.step = "aguardando_data"
        conversationStates.set(numeroLimpo, estado)

        console.log(`✅ Estado atualizado:`, estado)
        console.log(`📤 Enviando solicitação de data...`)

        await client.sendMessage(
          telefone,
          "Perfeito! Agora me diga qual a data do compromisso?\n\nExemplos: 25/12, 25-12, 25/12/2024\n\nDigite SAIR a qualquer momento para cancelar."
        )
        console.log(`✅ Mensagem de data enviada com sucesso!`)
        break

      case "aguardando_data":
        console.log(`\n📅 === PROCESSANDO DATA ===`)
        console.log(`📥 Data recebida: "${mensagem}"`)

        const dataFormatada = processarData(mensagem)
        console.log(`🔍 Data após processamento: ${dataFormatada}`)

        if (!dataFormatada) {
          console.log(`❌ Data inválida, enviando mensagem de erro...`)
          await client.sendMessage(
            telefone,
            "Data inválida! ❌\n\nPor favor, use um dos formatos:\n• 25/12\n• 25-12\n• 25/12/2024\n\nDigite SAIR a qualquer momento para cancelar."
          )
          return
        }

        estado.data.data = dataFormatada
        estado.step = "aguardando_horario"
        conversationStates.set(numeroLimpo, estado)

        console.log(`✅ Data válida: ${dataFormatada}`)
        console.log(`✅ Estado atualizado:`, estado)
        console.log(`📤 Enviando solicitação de horário...`)

        await client.sendMessage(
          telefone,
          "Ótimo! Agora me diga qual o horário do compromisso?\n\nExemplos: 15h30, 15:30, 1530, 15h ou 15\n\nDigite SAIR a qualquer momento para cancelar."
        )
        console.log(`✅ Mensagem de horário enviada com sucesso!`)
        break

      case "aguardando_horario":
        console.log(`\n⏰ === PROCESSANDO HORÁRIO ===`)
        console.log(`📥 Horário recebido: "${mensagem}"`)

        const horaFormatada = processarHorario(mensagem)
        console.log(`🔍 Horário após processamento: ${horaFormatada}`)

        if (!horaFormatada) {
          console.log(`❌ Horário inválido, enviando mensagem de erro...`)
          await client.sendMessage(
            telefone,
            "Horário inválido! ❌\n\nPor favor, use um dos formatos:\n• 15h30\n• 15:30\n• 1530\n• 15h\n• 15\n\nDigite SAIR a qualquer momento para cancelar."
          )
          return
        }

        estado.data.hora = horaFormatada
        estado.step = "aguardando_recorrencia"
        conversationStates.set(numeroLimpo, estado)

        console.log(`✅ Horário válido: ${horaFormatada}`)
        console.log(`✅ Estado atualizado:`, estado)
        console.log(`📤 Enviando solicitação de frequência...`)

        await client.sendMessage(
          telefone,
          `Perfeito! Horário ${horaFormatada} confirmado! ✅\n\nAgora escolha a frequência do compromisso:\n\n1️⃣ - Único (apenas esta data)\n2️⃣ - Diário\n3️⃣ - Semanal\n4️⃣ - Mensal\n\nDigite o número da opção desejada ou SAIR para cancelar:`
        )
        console.log(`✅ Mensagem de frequência enviada com sucesso!`)
        break

      case "aguardando_recorrencia":
        console.log(`\n🔄 === PROCESSANDO RECORRÊNCIA ===`)
        console.log(`📥 Opção recebida: "${mensagem}"`)

        const opcoes = {
          1: "unico",
          2: "diario",
          3: "semanal",
          4: "mensal",
        }

        if (!opcoes[mensagem]) {
          console.log(`❌ Opção inválida, enviando mensagem de erro...`)
          await client.sendMessage(
            telefone,
            "Opção inválida! ❌\n\nPor favor, digite um número de 1 a 4:\n\n1️⃣ - Único\n2️⃣ - Diário\n3️⃣ - Semanal\n4️⃣ - Mensal\n\nDigite SAIR a qualquer momento para cancelar."
          )
          return
        }

        console.log(`✅ Recorrência selecionada: ${opcoes[mensagem]}`)
        console.log(`💾 Dados finais do compromisso:`, estado.data)
        console.log(`📤 Tentando salvar compromisso...`)

        // Criar cópia dos dados antes de limpar o estado
        const dadosCompromisso = {
          nome: estado.nome,
          assunto: estado.data.assunto,
          data: estado.data.data,
          hora: estado.data.hora,
          recorrencia: opcoes[mensagem]
        }

        // Limpar estado IMEDIATAMENTE após capturar os dados
        limparEstadoConversa(telefone)
        console.log(`🗑️ Estado da conversa limpo`)

        // Salvar compromisso
        const sucesso = await salvarCompromisso(
          telefone,
          dadosCompromisso.nome,
          dadosCompromisso.assunto,
          dadosCompromisso.data,
          dadosCompromisso.hora,
          dadosCompromisso.recorrencia
        )

        if (sucesso) {
          const frequenciaTexto = {
            unico: "Único (apenas esta data)",
            diario: "Diário",
            semanal: "Semanal",
            mensal: "Mensal",
          }[dadosCompromisso.recorrencia]

          console.log(`📤 Enviando mensagem de sucesso...`)
          await client.sendMessage(
            telefone,
            `🎉 COMPROMISSO AGENDADO COM SUCESSO! 🎉\n\n📝 Assunto: ${dadosCompromisso.assunto}\n📅 Data: ${new Date(dadosCompromisso.data).toLocaleDateString('pt-BR')}\n⏰ Horário: ${dadosCompromisso.hora}\n🔄 Frequência: ${frequenciaTexto}\n\n🔔 Enviarei um lembrete 1 hora antes do evento!\n\n✅ Tudo pronto!`
          )
        } else {
          console.log(`❌ Erro ao salvar, enviando mensagem de erro...`)
          await client.sendMessage(
            telefone,
            "❌ Desculpe, ocorreu um erro ao agendar o compromisso.\n\nPor favor, tente novamente digitando AGENDAR."
          )
        }

        // Aguardar um pouco antes de enviar o menu
        console.log(`⏳ Aguardando 2 segundos para enviar menu...`)
        setTimeout(async () => {
          console.log(`📤 Enviando menu de opções...`)
          await enviarMenuOpcoes(telefone, dadosCompromisso.nome)
        }, 2000)
        break

      case "aguardando_recorrencia_exclusao":
        console.log(`\n🗑️ === PROCESSANDO RECORRÊNCIA PARA EXCLUSÃO ===`)
        console.log(`📥 Opção recebida: "${mensagem}"`)

        const opcoesExclusao = {
          1: "diario",
          2: "semanal",
          3: "mensal",
          4: "todas",
        }

        if (!opcoesExclusao[mensagem]) {
          console.log(`❌ Opção inválida, enviando mensagem de erro...`)
          await client.sendMessage(
            telefone,
            "Opção inválida! ❌\n\nPor favor, digite um número de 1 a 4:\n\n1️⃣ - Diário\n2️⃣ - Semanal\n3️⃣ - Mensal\n4️⃣ - Todas\n\nDigite SAIR a qualquer momento para cancelar."
          )
          return
        }

        const recorrenciaSelecionada = opcoesExclusao[mensagem]
        const compromissos = await buscarCompromissosPorRecorrencia(telefone, recorrenciaSelecionada)

        if (compromissos.length === 0) {
          console.log(`❌ Nenhum compromisso encontrado`)
          await client.sendMessage(
            telefone,
            `Não foram encontrados compromissos com recorrência ${recorrenciaSelecionada}.\n\nDigite EXCLUIR para tentar novamente ou escolha outra opção do menu.`
          )
          limparEstadoConversa(telefone)
          setTimeout(async () => {
            await enviarMenuOpcoes(telefone, estado.nome)
          }, 1000)
          return
        }

        estado.data.recorrencia = recorrenciaSelecionada
        estado.data.compromissos = compromissos
        estado.step = "aguardando_selecao_compromisso"
        conversationStates.set(numeroLimpo, estado)

        let mensagemCompromissos = "Escolha o compromisso que deseja excluir digitando seu ID:\n\n"
        compromissos.forEach((comp) => {
          const data = new Date(comp.data_compromisso).toLocaleDateString("pt-BR")
          mensagemCompromissos += `ID ${comp.id}:\n📅 ${data}\n⏰ ${comp.hora_compromisso.substring(0, 5)}\n📝 ${comp.assunto}\n\n`
        })
        mensagemCompromissos += "Digite o ID do compromisso, VOLTAR para retornar ao menu anterior, ou SAIR para cancelar."

        await client.sendMessage(telefone, mensagemCompromissos)
        break

      case "aguardando_selecao_compromisso":
        console.log(`\n🗑️ === PROCESSANDO SELEÇÃO DE COMPROMISSO ===`)
        console.log(`📥 ID recebido: "${mensagem}"`)

        const mensagemNormalizada = normalizarTexto(mensagem)

        if (mensagemNormalizada === "voltar") {
          estado.step = "aguardando_recorrencia_exclusao"
          conversationStates.set(numeroLimpo, estado)

          await client.sendMessage(
            telefone,
            `Escolha a recorrência dos compromissos que deseja visualizar para excluir:\n\n1️⃣ - Diário\n2️⃣ - Semanal\n3️⃣ - Mensal\n4️⃣ - Todas\n\nDigite o número da opção desejada ou SAIR para cancelar.`
          )
          return
        }

        const idSelecionado = parseInt(mensagem)
        const compromissoSelecionado = estado.data.compromissos.find(c => c.id === idSelecionado)

        if (!compromissoSelecionado) {
          console.log(`❌ Compromisso não encontrado`)
          await client.sendMessage(
            telefone,
            "ID inválido! ❌\n\nPor favor, digite um ID válido da lista, VOLTAR para retornar ao menu anterior, ou SAIR para cancelar."
          )
          return
        }

        estado.data.compromissoSelecionado = compromissoSelecionado
        estado.step = "aguardando_confirmacao_exclusao"
        conversationStates.set(numeroLimpo, estado)

        const dataCompromisso = new Date(compromissoSelecionado.data_compromisso).toLocaleDateString("pt-BR")
        await client.sendMessage(
          telefone,
          `Você deseja excluir este compromisso?\n\n📅 ${dataCompromisso}\n⏰ ${compromissoSelecionado.hora_compromisso.substring(0, 5)}\n📝 ${compromissoSelecionado.assunto}\n\nDigite SIM para confirmar ou NÃO para escolher outro compromisso.`
        )
        break

      case "aguardando_confirmacao_exclusao":
        console.log(`\n🗑️ === PROCESSANDO CONFIRMAÇÃO DE EXCLUSÃO ===`)
        console.log(`📥 Resposta recebida: "${mensagem}"`)

        const respostaNormalizada = normalizarTexto(mensagem)

        if (respostaNormalizada === "sim") {
          const nomeUsuario = estado.nome
          const sucesso = await excluirCompromisso(estado.data.compromissoSelecionado.id)

          // Limpar estado IMEDIATAMENTE
          limparEstadoConversa(telefone)

          if (sucesso) {
            await client.sendMessage(
              telefone,
              "✅ Compromisso excluído com sucesso!"
            )
          } else {
            await client.sendMessage(
              telefone,
              "❌ Erro ao excluir o compromisso. Por favor, tente novamente."
            )
          }

          setTimeout(async () => {
            await enviarMenuOpcoes(telefone, nomeUsuario)
          }, 1000)
        } else if (respostaNormalizada === "nao" || respostaNormalizada === "não") {
          estado.step = "aguardando_recorrencia_exclusao"
          conversationStates.set(numeroLimpo, estado)

          await client.sendMessage(
            telefone,
            `Escolha a recorrência dos compromissos que deseja visualizar para excluir:\n\n1️⃣ - Diário\n2️⃣ - Semanal\n3️⃣ - Mensal\n4️⃣ - Todas\n\nDigite o número da opção desejada ou SAIR para cancelar.`
          )
        } else {
          await client.sendMessage(
            telefone,
            "Resposta inválida! ❌\n\nDigite SIM para excluir o compromisso ou NÃO para escolher outro."
          )
        }
        break

      case "aguardando_recorrencia_edicao":
        console.log(`\n✏️ === PROCESSANDO RECORRÊNCIA PARA EDIÇÃO ===`)
        console.log(`📥 Opção recebida: "${mensagem}"`)

        const opcoesEdicao = {
          1: "unico",
          2: "diario",
          3: "semanal",
          4: "mensal",
          5: "todas",
        }

        if (!opcoesEdicao[mensagem]) {
          console.log(`❌ Opção inválida, enviando mensagem de erro...`)
          await client.sendMessage(
            telefone,
            "Opção inválida! ❌\n\nPor favor, digite um número de 1 a 5:\n\n1️⃣ - Único\n2️⃣ - Diário\n3️⃣ - Semanal\n4️⃣ - Mensal\n5️⃣ - Todas\n\nDigite SAIR a qualquer momento para cancelar."
          )
          return
        }

        const recorrenciaEdicao = opcoesEdicao[mensagem]
        const compromissosEdicao = await buscarCompromissosPorRecorrencia(telefone, recorrenciaEdicao)

        if (compromissosEdicao.length === 0) {
          console.log(`❌ Nenhum compromisso encontrado`)
          await client.sendMessage(
            telefone,
            `Não foram encontrados compromissos com recorrência ${recorrenciaEdicao}.\n\nDigite EDITAR para tentar novamente ou escolha outra opção do menu.`
          )
          limparEstadoConversa(telefone)
          setTimeout(async () => {
            await enviarMenuOpcoes(telefone, estado.nome)
          }, 1000)
          return
        }

        estado.data.recorrencia = recorrenciaEdicao
        estado.data.compromissos = compromissosEdicao
        estado.step = "aguardando_selecao_compromisso_edicao"
        conversationStates.set(numeroLimpo, estado)

        let mensagemCompromissosEdicao = "Escolha o compromisso que deseja editar digitando seu ID:\n\n"
        compromissosEdicao.forEach((comp) => {
          const data = new Date(comp.data_compromisso).toLocaleDateString("pt-BR")
          mensagemCompromissosEdicao += `ID ${comp.id}:\n📅 ${data}\n⏰ ${comp.hora_compromisso.substring(0, 5)}\n📝 ${comp.assunto}\n\n`
        })
        mensagemCompromissosEdicao += "Digite o ID do compromisso, VOLTAR para retornar ao menu anterior, ou SAIR para cancelar."

        await client.sendMessage(telefone, mensagemCompromissosEdicao)
        break

      case "aguardando_selecao_compromisso_edicao":
        console.log(`\n✏️ === PROCESSANDO SELEÇÃO DE COMPROMISSO PARA EDIÇÃO ===`)
        console.log(`📥 ID recebido: "${mensagem}"`)

        const mensagemNormalizadaEdicao = normalizarTexto(mensagem)

        if (mensagemNormalizadaEdicao === "voltar") {
          estado.step = "aguardando_recorrencia_edicao"
          conversationStates.set(numeroLimpo, estado)

          await client.sendMessage(
            telefone,
            `Escolha a recorrência dos compromissos que deseja visualizar para editar:\n\n1️⃣ - Único\n2️⃣ - Diário\n3️⃣ - Semanal\n4️⃣ - Mensal\n5️⃣ - Todas\n\nDigite o número da opção desejada ou SAIR para cancelar.`
          )
          return
        }

        const idEdicao = parseInt(mensagem)
        const compromissoEdicao = estado.data.compromissos.find(c => c.id === idEdicao)

        if (!compromissoEdicao) {
          console.log(`❌ Compromisso não encontrado`)
          await client.sendMessage(
            telefone,
            "ID inválido! ❌\n\nPor favor, digite um ID válido da lista, VOLTAR para retornar ao menu anterior, ou SAIR para cancelar."
          )
          return
        }

        estado.data.compromissoSelecionado = compromissoEdicao
        estado.step = "aguardando_campo_edicao"
        conversationStates.set(numeroLimpo, estado)

        const dataCompromissoEdicao = new Date(compromissoEdicao.data_compromisso).toLocaleDateString("pt-BR")
        await client.sendMessage(
          telefone,
          `O que você deseja alterar neste compromisso?\n\n📅 ${dataCompromissoEdicao}\n⏰ ${compromissoEdicao.hora_compromisso.substring(0, 5)}\n📝 ${compromissoEdicao.assunto}\n\nOpções:\n1️⃣ - Nome\n2️⃣ - Data\n3️⃣ - Horário\n4️⃣ - Recorrência\n\nDigite o número da opção desejada, VOLTAR para escolher outro compromisso, ou SAIR para cancelar.`
        )
        break

      case "aguardando_campo_edicao":
        console.log(`\n✏️ === PROCESSANDO CAMPO PARA EDIÇÃO ===`)
        console.log(`📥 Opção recebida: "${mensagem}"`)

        const mensagemNormalizadaCampo = normalizarTexto(mensagem)

        const opcoesCampos = {
          1: "nome",
          2: "data",
          3: "horario",
          4: "recorrencia"
        }

        if (mensagemNormalizadaCampo === "voltar") {
          estado.step = "aguardando_selecao_compromisso_edicao"
          conversationStates.set(numeroLimpo, estado)

          let mensagemCompromissosVoltar = "Escolha o compromisso que deseja editar digitando seu ID:\n\n"
          estado.data.compromissos.forEach((comp) => {
            const data = new Date(comp.data_compromisso).toLocaleDateString("pt-BR")
            mensagemCompromissosVoltar += `ID ${comp.id}:\n📅 ${data}\n⏰ ${comp.hora_compromisso.substring(0, 5)}\n📝 ${comp.assunto}\n\n`
          })
          mensagemCompromissosVoltar += "Digite o ID do compromisso, VOLTAR para retornar ao menu anterior, ou SAIR para cancelar."

          await client.sendMessage(telefone, mensagemCompromissosVoltar)
          return
        }

        if (!opcoesCampos[mensagem]) {
          console.log(`❌ Opção inválida`)
          await client.sendMessage(
            telefone,
            "Opção inválida! ❌\n\nPor favor, digite um número de 1 a 4:\n\n1️⃣ - Nome\n2️⃣ - Data\n3️⃣ - Horário\n4️⃣ - Recorrência\n\nOu digite VOLTAR para escolher outro compromisso."
          )
          return
        }

        estado.data.campoEdicao = opcoesCampos[mensagem]
        estado.step = "aguardando_valor_edicao"
        conversationStates.set(numeroLimpo, estado)

        let mensagemSolicitacao = ""
        switch (estado.data.campoEdicao) {
          case "nome":
            mensagemSolicitacao = "Digite o novo nome do compromisso:"
            break
          case "data":
            mensagemSolicitacao = "Digite a nova data do compromisso:\n\nExemplos: 25/12, 25-12, 25/12/2024"
            break
          case "horario":
            mensagemSolicitacao = "Digite o novo horário do compromisso:\n\nExemplos: 15h30, 15:30, 1530, 15h ou 15"
            break
          case "recorrencia":
            mensagemSolicitacao = "Escolha a nova recorrência:\n\n1️⃣ - Único\n2️⃣ - Diário\n3️⃣ - Semanal\n4️⃣ - Mensal"
            break
        }

        await client.sendMessage(
          telefone,
          `${mensagemSolicitacao}\n\nDigite VOLTAR para escolher outro campo ou SAIR para cancelar.`
        )
        break

      case "aguardando_valor_edicao":
        console.log(`\n✏️ === PROCESSANDO VALOR PARA EDIÇÃO ===`)
        console.log(`📥 Valor recebido: "${mensagem}"`)

        const mensagemNormalizadaValor = normalizarTexto(mensagem)

        if (mensagemNormalizadaValor === "voltar") {
          estado.step = "aguardando_campo_edicao"
          conversationStates.set(numeroLimpo, estado)

          const dataCompromissoVoltar = new Date(estado.data.compromissoSelecionado.data_compromisso).toLocaleDateString("pt-BR")
          await client.sendMessage(
            telefone,
            `O que você deseja alterar neste compromisso?\n\n📅 ${dataCompromissoVoltar}\n⏰ ${estado.data.compromissoSelecionado.hora_compromisso.substring(0, 5)}\n📝 ${estado.data.compromissoSelecionado.assunto}\n\nOpções:\n1️⃣ - Nome\n2️⃣ - Data\n3️⃣ - Horário\n4️⃣ - Recorrência\n\nDigite o número da opção desejada, VOLTAR para escolher outro compromisso, ou SAIR para cancelar.`
          )
          return
        }

        let valorValidado = mensagem
        let mensagemErro = null

        switch (estado.data.campoEdicao) {
          case "data":
            valorValidado = processarData(mensagem)
            if (!valorValidado) {
              mensagemErro = "Data inválida! Por favor, use um dos formatos:\n• 25/12\n• 25-12\n• 25/12/2024"
            }
            break
          case "horario":
            valorValidado = processarHorario(mensagem)
            if (!valorValidado) {
              mensagemErro = "Horário inválido! Por favor, use um dos formatos:\n• 15h30\n• 15:30\n• 1530\n• 15h\n• 15"
            }
            break
          case "recorrencia":
            const opcoesRecorrencia = {
              1: "unico",
              2: "diario",
              3: "semanal",
              4: "mensal"
            }
            valorValidado = opcoesRecorrencia[mensagem]
            if (!valorValidado) {
              mensagemErro = "Opção inválida! Digite um número de 1 a 4:\n\n1️⃣ - Único\n2️⃣ - Diário\n3️⃣ - Semanal\n4️⃣ - Mensal"
            }
            break
        }

        if (mensagemErro) {
          await client.sendMessage(
            telefone,
            `${mensagemErro}\n\nDigite VOLTAR para escolher outro campo ou SAIR para cancelar.`
          )
          return
        }

        estado.data.valorEdicao = valorValidado
        estado.step = "aguardando_confirmacao_edicao"
        conversationStates.set(numeroLimpo, estado)

        let mensagemConfirmacao = `Confirma a alteração do ${estado.data.campoEdicao} para: ${valorValidado}?\n\nDigite SIM para confirmar ou NÃO para digitar novamente.`
        await client.sendMessage(telefone, mensagemConfirmacao)
        break

      case "aguardando_confirmacao_edicao":
        console.log(`\n✏️ === PROCESSANDO CONFIRMAÇÃO DE EDIÇÃO ===`)
        console.log(`📥 Resposta recebida: "${mensagem}"`)

        const respostaEdicao = normalizarTexto(mensagem)

        if (respostaEdicao === "sim") {
          const nomeUsuario = estado.nome
          const sucesso = await atualizarCompromisso(
            estado.data.compromissoSelecionado.id,
            estado.data.campoEdicao,
            estado.data.valorEdicao
          )

          // Limpar estado IMEDIATAMENTE
          limparEstadoConversa(telefone)

          if (sucesso) {
            await client.sendMessage(
              telefone,
              "✅ Compromisso atualizado com sucesso!"
            )
          } else {
            await client.sendMessage(
              telefone,
              "❌ Erro ao atualizar o compromisso. Por favor, tente novamente."
            )
          }

          setTimeout(async () => {
            await enviarMenuOpcoes(telefone, nomeUsuario)
          }, 1000)
        } else if (respostaEdicao === "nao" || respostaEdicao === "não") {
          estado.step = "aguardando_valor_edicao"
          conversationStates.set(numeroLimpo, estado)

          let mensagemSolicitacaoNova = ""
          switch (estado.data.campoEdicao) {
            case "nome":
              mensagemSolicitacaoNova = "Digite o novo nome do compromisso:"
              break
            case "data":
              mensagemSolicitacaoNova = "Digite a nova data do compromisso:\n\nExemplos: 25/12, 25-12, 25/12/2024"
              break
            case "horario":
              mensagemSolicitacaoNova = "Digite o novo horário do compromisso:\n\nExemplos: 15h30, 15:30, 1530, 15h ou 15"
              break
            case "recorrencia":
              mensagemSolicitacaoNova = "Escolha a nova recorrência:\n\n1️⃣ - Único\n2️⃣ - Diário\n3️⃣ - Semanal\n4️⃣ - Mensal"
              break
          }

          await client.sendMessage(
            telefone,
            `${mensagemSolicitacaoNova}\n\nDigite VOLTAR para escolher outro campo ou SAIR para cancelar.`
          )
        } else {
          await client.sendMessage(
            telefone,
            "Resposta inválida! ❌\n\nDigite SIM para confirmar a alteração ou NÃO para digitar novamente."
          )
        }
        break

      default:
        console.log(`❌ Step desconhecido: ${estado.step}`)
        limparEstadoConversa(telefone)
        await enviarMenuOpcoes(telefone, estado.nome)
        break
    }
  } catch (error) {
    console.error(`\n❌ === ERRO NO FLUXO DE AGENDAMENTO ===`)
    console.error(`❌ Mensagem de erro:`, error.message)
    console.error(`❌ Stack trace:`, error.stack)

    const nomeUsuario = estado?.nome || "Usuário"
    limparEstadoConversa(telefone)
    console.log(`🗑️ Estado da conversa limpo devido ao erro`)

    console.log(`📤 Enviando mensagem de erro para o usuário...`)
    await client.sendMessage(
      telefone,
      "❌ Ocorreu um erro no agendamento. Vamos começar novamente.\n\nDigite AGENDAR para tentar novamente."
    )

    setTimeout(async () => {
      console.log(`📤 Enviando menu de opções após erro...`)
      await enviarMenuOpcoes(telefone, nomeUsuario)
    }, 1000)
  }
}

// Eventos do cliente WhatsApp
client.on("qr", (qr) => {
  console.log("📱 QR RECEBIDO, escaneie com o WhatsApp:")
  qrcode.generate(qr, { small: true })
})

client.on("ready", async () => {
  console.log("✅ Cliente WhatsApp conectado!")
  console.log("🚀 Bot WhatsApp iniciado!")
})

client.on("message", async (message) => {
  if (message.fromMe) return
  if (message.from.includes("@g.us")) return
  if (message.type !== "chat") return

  const telefone = message.from
  const mensagem = message.body.trim()

  try {
    const contact = await message.getContact()
    const nome = contact.pushname || contact.name || "Usuário"

    console.log(`\n📱 Mensagem recebida de ${nome} (${telefone}): ${mensagem}`)
    await processarMensagem(telefone, mensagem, nome)
  } catch (error) {
    console.error("❌ Erro ao processar mensagem:", error.message)
    try {
      await client.sendMessage(telefone, "Desculpe, ocorreu um erro. Tente novamente.")
      setTimeout(async () => {
        const contact = await message.getContact()
        const nome = contact.pushname || contact.name || "Usuário"
        await enviarMenuOpcoes(telefone, nome)
      }, 1000)
    } catch (sendError) {
      console.error("❌ Erro ao enviar mensagem de erro:", sendError.message)
    }
  }
})

// Função para resetar lembrete_enviado para compromissos recorrentes
async function resetarLembreteRecorrente(id) {
  let connection = null

  try {
    connection = await connectDB()
    await connection.execute(
      "UPDATE compromissos SET lembrete_enviado = FALSE WHERE id = ? AND recorrencia != 'unico'",
      [id]
    )
    console.log(`✅ Lembrete resetado para compromisso recorrente ID: ${id}`)
    return true
  } catch (error) {
    console.error("❌ Erro ao resetar lembrete recorrente:", error.message)
    return false
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error("❌ Erro ao fechar conexão:", closeError.message)
      }
    }
  }
}

// Cron job para lembretes
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

        // Se for compromisso recorrente, reseta o lembrete_enviado
        if (compromisso.recorrencia !== 'unico') {
          setTimeout(async () => {
            await resetarLembreteRecorrente(compromisso.id)
          }, 5000) // Espera 5 segundos para resetar
        }
      } else if (diferencaMinutos <= 0 && diferencaMinutos >= -5) {
        const mensagem = `⚠️ ATENÇÃO!\n\nVocê tem um compromisso agendado para agora:\n\n📋 ${compromisso.assunto}\n⏰ ${horaCompromisso}`
        await client.sendMessage(telefoneFormatado, mensagem)
        await marcarLembreteEnviado(compromisso.id)
        console.log(`✅ Lembrete atrasado enviado para ${telefoneFormatado} - Compromisso: ${compromisso.assunto}`)

        // Se for compromisso recorrente, reseta o lembrete_enviado
        if (compromisso.recorrencia !== 'unico') {
          setTimeout(async () => {
            await resetarLembreteRecorrente(compromisso.id)
          }, 5000) // Espera 5 segundos para resetar
        }
      }
    }
  } catch (error) {
    console.error("❌ Erro ao enviar lembretes:", error.message)
  }
})


client.initialize()