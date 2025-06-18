module.exports = {
  apps: [{
    name: 'whatsapp-bot',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--experimental-specifier-resolution=node',
    env: {
      NODE_ENV: 'production'
    }
  }]
} 