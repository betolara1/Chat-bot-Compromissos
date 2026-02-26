/**
 * Utilitários para processamento de dados do Bot de Agendamento
 */

/**
 * Normaliza o texto removendo acentos e convertendo para minúsculo
 * @param {string} texto 
 * @returns {string}
 */
export function normalizarTexto(texto) {
    if (!texto) return ""
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
}

/**
 * Processa uma string de horário e retorna no formato HH:mm
 * @param {string} horarioTexto 
 * @returns {string|null}
 */
export function processarHorario(horarioTexto) {
    if (!horarioTexto) return null

    const texto = horarioTexto.trim().toLowerCase()

    // Formatos aceitos: 15h30, 15:30, 1530, 15h, 15
    const regexes = [
        /^(\d{1,2})h(\d{2})$/, // 15h30
        /^(\d{1,2}):(\d{2})$/, // 15:30
        /^(\d{4})$/, // 1530
        /^(\d{1,2})h$/, // 15h
        /^(\d{1,2})$/, // 15
    ]

    for (const regex of regexes) {
        const match = texto.match(regex)
        if (match) {
            let hora, minuto

            if (match[0].length === 4 && !match[0].includes("h") && !match[0].includes(":")) {
                hora = parseInt(match[1].substring(0, 2))
                minuto = parseInt(match[1].substring(2))
            } else if (match[2]) {
                hora = parseInt(match[1])
                minuto = parseInt(match[2])
            } else {
                hora = parseInt(match[1])
                minuto = 0
            }

            if (hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59) {
                return `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`
            }
        }
    }

    return null
}

/**
 * Processa uma string de data e retorna no formato YYYY-MM-DD
 * @param {string} dataTexto 
 * @returns {string|null}
 */
export function processarData(dataTexto) {
    if (!dataTexto) return null

    const anoBase = 2025
    const texto = dataTexto.trim().toLowerCase()

    const regexes = [
        /^(\d{1,2})[/-](\d{1,2})$/, // DD/MM ou DD-MM
        /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/, // DD/MM/YYYY ou DD-MM-YYYY
    ]

    for (const regex of regexes) {
        const match = texto.match(regex)
        if (match) {
            const dia = parseInt(match[1])
            const mes = parseInt(match[2])
            const anoMatch = match[3] ? parseInt(match[3]) : anoBase

            if (mes < 1 || mes > 12) return null

            const ultimoDiaDoMes = new Date(anoMatch, mes, 0).getDate()
            if (dia < 1 || dia > ultimoDiaDoMes) return null

            const dataCompromisso = new Date(anoMatch, mes - 1, dia)
            return dataCompromisso.toISOString().split("T")[0]
        }
    }

    return null
}
