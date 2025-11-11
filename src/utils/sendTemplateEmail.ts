import sendEmail from './sendEmail'
import { MessageTemplate } from '../modules/messageTemplate/messageTemplate.model'

/**
 * Sends an email using an active message template for a given type.
 *
 * @param to - Recipient email address
 * @param type - Template type ('trips' | 'product' | 'courses')
 * @param placeholders - Optional object to replace placeholders in the messageBody or subject
 */
export const sendTemplateEmail = async (
  to: string,
  type: 'trips' | 'product' | 'courses',
  placeholders: Record<string, string> = {}
): Promise<void> => {
  try {
    console.log('Email send to ', to)
    // 1️⃣ Find the active message template for the given type
    const template = await MessageTemplate.findOne({ type, status: 'active' })
    if (!template) {
      console.warn(`No active template found for type: ${type}`)
      return
    }

    // 2️⃣ Replace placeholders in subject and message body (optional)
    let subject = template.emailSubject
    let html = template.messageBody

    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      subject = subject.replace(regex, value)
      html = html.replace(regex, value)
    }

    // 3️⃣ Send the email (don’t await here if you want to run it in background)
    void sendEmail({
      to,
      subject,
      html,
    }).catch((err) => console.error('Email send error:', err.message))
  } catch (error) {
    console.error('sendTemplateEmail error:', (error as Error).message)
  }
}
