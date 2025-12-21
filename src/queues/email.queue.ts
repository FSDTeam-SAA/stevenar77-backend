import { Queue } from 'bullmq'
import { redisConfig } from '../config/redis'

export interface EmailJobData {
  to: string
  subject: string
  body: string
}

const emailQueue = new Queue('email-queue', {
  connection: redisConfig,
})
