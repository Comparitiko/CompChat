import express from 'express'
import logger from 'morgan'
import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

import { Server } from 'socket.io'
import { createServer } from 'node:http'

dotenv.config()

const port = process.env.PORT ?? 3000

// Inicializar express
const app = express()
// Crear un server  con node:http
const server = createServer(app)

// Inicializar server de socket.io
const io = new Server(server, {
  connectionStateRecovery: { maxDisconnectionDuration: 60 }
})

// Conexion base de datos
const db = createClient({
  url: 'libsql://classic-invisible-woman-comparitiko.turso.io',
  authToken: process.env.DB_TOKEN
})

// Crear tabla en la DB
await db.execute(`
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT,
  user TEXT
)
`)

// Detectar cuando hay una conexion
io.on('connection', async (socket) => {
  console.log('Un usuario se ha conectado')

  // Detectar cuando hay una desconexion
  socket.on('disconnect', () => {
    console.log('Un usuario se ha desconectado')
  })

  // Detectar mensajes y mandarlos a todos los usuarios e insertarlos en la base de datos
  socket.on('chat message', async (msg) => {
    let result
    const username = socket.handshake.auth.username ?? 'anonymous'
    try {
      result = await db.execute({
        sql: 'INSERT INTO messages (content, user) VALUES (:msg, :username)',
        args: { msg, username }
      })
    } catch (e) {
      console.log(e)
      return
    }
    io.emit('chat message', msg, result.lastInsertRowid.toString(), username)
  })

  // Si no se ha podido recuperar el socket recuperara todos los mensajes escritos hasta ese momento
  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: 'SELECT id, content, user FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0]
      })
      results.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id.toString(), row.user)
      })
    } catch (e) {
      console.error(e)
    }
  }
})

// Usar morgan para ver eventos de login en consola
app.use(logger('dev'))

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html')
})

// En vez de escuchar la app creada con express escuchamos server que se crea con app
server.listen(port, () => {
  console.log(`Server funcionando en el puerto ${port}`)
})
