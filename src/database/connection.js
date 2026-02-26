import mysql from "mysql2/promise"
import { dbConfig } from "../config/db.js"

// Função para conectar ao banco
export async function connectDB() {
    try {
        const connection = await mysql.createConnection(dbConfig)
        console.log("✅ Conexão com banco estabelecida")
        return connection
    } catch (error) {
        console.error("❌ Erro ao conectar ao banco:", error.message)
        throw error
    }
}
