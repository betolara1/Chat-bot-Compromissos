import { connectDB } from "./connection.js"

// Função para verificar se usuário está registrado
export async function verificarUsuarioRegistrado(telefone) {
    const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "")
    let connection = null
    let rows = []

    try {
        connection = await connectDB()
        rows = await connection.execute("SELECT * FROM usuarios WHERE telefone = ?", [numeroLimpo])

        if (rows[0].length === 0 && numeroLimpo.length >= 10) {
            const ultimosDezDigitos = numeroLimpo.slice(-10)
            rows = await connection.execute("SELECT * FROM usuarios WHERE telefone LIKE ?", [`%${ultimosDezDigitos}`])
        }

        if (rows[0].length === 0 && numeroLimpo.length >= 8) {
            const ultimosOitoDigitos = numeroLimpo.slice(-8)
            rows = await connection.execute("SELECT * FROM usuarios WHERE telefone LIKE ?", [`%${ultimosOitoDigitos}`])
        }

        if (rows[0].length === 0 && numeroLimpo.length === 10) {
            const ddd = numeroLimpo.substring(0, 2)
            const restante = numeroLimpo.substring(2)
            const numeroComNove = `${ddd}9${restante}`
            rows = await connection.execute("SELECT * FROM usuarios WHERE telefone = ?", [numeroComNove])
        }

        if (rows[0].length === 0 && numeroLimpo.length === 11) {
            const ddd = numeroLimpo.substring(0, 2)
            const restante = numeroLimpo.substring(3)
            const numeroSemNove = `${ddd}${restante}`
            rows = await connection.execute("SELECT * FROM usuarios WHERE telefone = ?", [numeroSemNove])
        }

        return rows[0].length > 0
    } catch (error) {
        console.error("❌ Erro ao verificar usuário:", error.message)
        return false
    } finally {
        if (connection) await connection.end()
    }
}

// Função para obter ID do usuário pelo telefone
export async function obterIdUsuario(telefone) {
    const numeroLimpo = telefone.replace("@c.us", "").replace(/[^0-9]/g, "")
    let connection = null
    let rows = []

    try {
        connection = await connectDB()
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

        return rows[0].length > 0 ? rows[0][0].id : null
    } catch (error) {
        console.error("❌ Erro ao obter ID do usuário:", error.message)
        return null
    } finally {
        if (connection) await connection.end()
    }
}

// Função para salvar compromisso
export async function salvarCompromisso(telefone, nome, assunto, data, hora, recorrencia) {
    let connection = null
    try {
        const idUsuario = await obterIdUsuario(telefone)
        if (!idUsuario) return false

        connection = await connectDB()
        await connection.execute(
            "INSERT INTO compromissos (id_usuario, assunto, data_compromisso, hora_compromisso, recorrencia) VALUES (?, ?, ?, ?, ?)",
            [idUsuario, assunto, data, hora, recorrencia || "unico"]
        )
        return true
    } catch (error) {
        console.error("❌ Erro ao salvar compromisso:", error.message)
        return false
    } finally {
        if (connection) await connection.end()
    }
}

// Função para buscar compromissos
export async function buscarCompromissos(telefone, tipo) {
    let connection = null
    try {
        const idUsuario = await obterIdUsuario(telefone)
        if (!idUsuario) return []

        connection = await connectDB()
        let query = ""
        let params = []

        const hoje = new Date()
        const dataHoje = hoje.toISOString().split("T")[0]

        const amanha = new Date(hoje)
        amanha.setDate(amanha.getDate() + 1)
        const dataAmanha = amanha.toISOString().split("T")[0]

        switch (tipo) {
            case "hoje":
                query = "SELECT * FROM compromissos WHERE id_usuario = ? AND DATE(data_compromisso) = ? ORDER BY hora_compromisso"
                params = [idUsuario, dataHoje]
                break
            case "amanha":
                query = "SELECT * FROM compromissos WHERE id_usuario = ? AND DATE(data_compromisso) = ? ORDER BY hora_compromisso"
                params = [idUsuario, dataAmanha]
                break
            case "proximos":
                query = "SELECT * FROM compromissos WHERE id_usuario = ? AND data_compromisso >= ? ORDER BY data_compromisso, hora_compromisso LIMIT 10"
                params = [idUsuario, dataHoje]
                break
            default:
                query = "SELECT * FROM compromissos WHERE id_usuario = ? ORDER BY data_compromisso, hora_compromisso"
                params = [idUsuario]
        }

        const [rows] = await connection.execute(query, params)
        return rows
    } catch (error) {
        console.error(`❌ Erro ao buscar compromissos ${tipo}:`, error.message)
        return []
    } finally {
        if (connection) await connection.end()
    }
}

export async function buscarCompromissosParaLembrete() {
    let connection = null
    try {
        connection = await connectDB()
        const dataHoje = new Date().toISOString().split("T")[0]
        const [rows] = await connection.execute(
            "SELECT c.*, u.telefone FROM compromissos c JOIN usuarios u ON c.id_usuario = u.id WHERE DATE(c.data_compromisso) = ? AND c.lembrete_enviado = FALSE ORDER BY c.hora_compromisso",
            [dataHoje]
        )
        return rows
    } catch (error) {
        console.error("❌ Erro ao buscar lembretes:", error.message)
        return []
    } finally {
        if (connection) await connection.end()
    }
}

export async function marcarLembreteEnviado(id) {
    let connection = null
    try {
        connection = await connectDB()
        await connection.execute("UPDATE compromissos SET lembrete_enviado = TRUE WHERE id = ?", [id])
        return true
    } catch (error) {
        console.error("❌ Erro ao marcar lembrete como enviado:", error.message)
        return false
    } finally {
        if (connection) await connection.end()
    }
}

export async function buscarCompromissosPorRecorrencia(telefone, recorrencia) {
    let connection = null
    try {
        const idUsuario = await obterIdUsuario(telefone)
        if (!idUsuario) return []

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

        const [rows] = await connection.execute(query, params)
        return rows
    } catch (error) {
        console.error(`❌ Erro ao buscar compromissos por recorrência:`, error.message)
        return []
    } finally {
        if (connection) await connection.end()
    }
}

export async function excluirCompromisso(id) {
    let connection = null
    try {
        connection = await connectDB()
        await connection.execute("DELETE FROM compromissos WHERE id = ?", [id])
        return true
    } catch (error) {
        console.error("❌ Erro ao excluir compromisso:", error.message)
        return false
    } finally {
        if (connection) await connection.end()
    }
}

export async function atualizarCompromisso(id, campo, valor) {
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
        if (!campoSQL) return false

        await connection.execute(`UPDATE compromissos SET ${campoSQL} = ? WHERE id = ?`, [valor, id])
        return true
    } catch (error) {
        console.error("❌ Erro ao atualizar compromisso:", error.message)
        return false
    } finally {
        if (connection) await connection.end()
    }
}

export async function resetarLembreteRecorrente(id) {
    let connection = null
    try {
        connection = await connectDB()
        await connection.execute(
            "UPDATE compromissos SET lembrete_enviado = FALSE WHERE id = ? AND recorrencia != 'unico'",
            [id]
        )
        return true
    } catch (error) {
        console.error("❌ Erro ao resetar lembrete recorrente:", error.message)
        return false
    } finally {
        if (connection) await connection.end()
    }
}
