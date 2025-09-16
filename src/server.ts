import http from 'http'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import app from './app'
import config from './config'
import { initSocket } from './socket' 

async function main() {
  try {
    // 1️⃣ Connect to MongoDB
    await mongoose.connect(config.mogodbUrl as string)
    console.log('✅ MongoDB connected')

    // 2️⃣ Create an HTTP server from the Express app
    const httpServer = http.createServer(app)

    // 3️⃣ Attach Socket.IO to that HTTP server
    const io = new Server(httpServer, {
      cors: {
        origin: '*', // or your frontend URL
        methods: ['GET', 'POST'],
      },
    })

    // 4️⃣ Initialize socket event handlers
    initSocket(io)

    // 5️⃣ Start the combined server
    httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`)
    })
  } catch (error) {
    console.error('Server failed to start:', error)
  }
}

main()

// import app from "./app";
// import mongoose from "mongoose";
// import config from "./config";

// async function main() {
//   try {
//     await mongoose.connect(config.mogodbUrl as string);

//     app.listen(config.port, () => {
//       console.log(`Server is running on port ${config.port}`);
//     });
//   } catch (error) {
//     console.log(error);
//   }
// }

// main();
