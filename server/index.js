import express from 'express'
import logger from 'morgan'

import { Server } from 'socket.io'
import { createServer } from 'node:http'

const port = process.env.PORT ?? 3000

// Inicializar express
const app = express()
// Crear un server  con node:http
const server = createServer(app)

// Inicializar server de socket.io
const io = new Server(server, {
  connectionStateRecovery: { maxDisconnectionDuration: 60 }
})

// Detectar cuando hay una conexion
io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado')

  // Detectar cuando hay una desconexion
  socket.on('disconnect', () => {
    console.log('Un usuario se ha desconectado')
  })

  // Detectar mensajes y mandarlos a todos los usuarios
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg)
  })
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
