import dotenv from "dotenv"
dotenv.config()

export const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "admin-bot",
    password: process.env.DB_PASSWORD || "FY4N6wd7prJksVvIPnbS",
    database: process.env.DB_NAME || "whatsapp-scheduler",
}

export const CADASTRO_URL = "https://bot-whatsapp.jsatecsistemas.com.br/agenda_whats.php"
export const CALENDARIO_URL = "https://bot-whatsapp.jsatecsistemas.com.br/calendario.php"
