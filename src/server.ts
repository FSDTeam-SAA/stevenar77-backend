import http from 'http'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import app from './app'
import config from './config'
import { initSocket } from './socket'
import { initNotificationSocket } from './socket/notification.service'
import './jobs/paymentStatusJob' 

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mogodbUrl as string)
    console.log(' MongoDB connected')

    // Create an HTTP server from the Express app
    const httpServer = http.createServer(app)

    // Attach Socket.IO to that HTTP server
    const io = new Server(httpServer, {
      cors: {
        origin: [
      'https://scuba-life.net',
      'https://www.scuba-life.net',
    ], // or your frontend URL
        methods: ['GET', 'POST','PUT','PATCH'],
      },
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)
      socket.on('joinRoom', (userId) => socket.join(userId))
    })

    //  Initialize socket event handlers
    initSocket(io)
    initNotificationSocket(io) 

    // Start the combined server
    httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`)
    })
  } catch (error) {
    console.error('Server failed to start:', error)
  }
}

main()
