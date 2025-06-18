-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS whatsapp_scheduler;
USE whatsapp_scheduler;

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_telefone (telefone),
  INDEX idx_email (email)
);

-- Criar tabela de compromissos
CREATE TABLE IF NOT EXISTS compromissos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  assunto TEXT NOT NULL,
  data_compromisso DATE NOT NULL,
  hora_compromisso TIME NOT NULL,
  recorrencia ENUM('unico', 'semanal', 'diario', 'mensal') NOT NULL DEFAULT 'unico',
  lembrete_enviado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
  INDEX idx_usuario_data (id_usuario, data_compromisso),
  INDEX idx_lembrete (data_compromisso, hora_compromisso, lembrete_enviado)
);
