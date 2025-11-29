import sendEmail from './sendEmail'
import { MessageTemplate } from '../modules/messageTemplate/messageTemplate.model'

/**
 * Sends an email using an active message template for a given type and title.
 *
 * @param to - Recipient email address
 * @param type - Template type ('trips' | 'product' | 'courses')
 * @param title - Item title to match with tempName
 * @param placeholders - Optional object to replace placeholders in the messageBody or subject
 */
export const sendTemplateEmail = async (
  to: string,
  type: 'trips' | 'product' | 'courses',
  title?: string,
  placeholders: Record<string, string> = {}
): Promise<void> => {
  try {
    console.log('Email send to ', to)
    console.log('title 1', title)

    // 1️⃣ First try to find template by type AND tempName matching the title
    let template = null
    // if (title) {
    //   template = await MessageTemplate.findOne({
    //     type,
    //     tempName: title, // Match tempName with item title
    //     status: 'active',
    //   })
    // }

//    if (title) {
//   template = await MessageTemplate.findOne({
//     type,
//     tempName: { $regex: new RegExp(`^${title.trim()}$`, 'i') }, // case-insensitive & trim
//     status: 'active',
//   })
// }


if (title) {
  template = await MessageTemplate.findOne({
    type,
    tempName: { $regex: new RegExp(`^${title.trim()}$`, 'i') }, // case-insensitive & trim
    status: 'active',
  })
}


console.log('Found template from send templete email:___', template)



    // 2️⃣ If no specific template found by title, fall back to generic template by type only
    if (!template) {
      console.warn(`No active template found for type: ${type}`)
      return
    }

    console.log(
      `Using template: ${template.tempName} for item: ${title || 'generic'}`
    )

    // 3️⃣ Replace placeholders in subject and message body
    let subject = template.emailSubject
    let html = template.messageBody

    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      subject = subject.replace(regex, value)
      html = html.replace(regex, value)
    }

    // 4️⃣ Send the email
    void sendEmail({
      to,
      subject,
      html,
    }).catch((err) => console.error('Email send error:', err.message))
  } catch (error) {
    console.error('sendTemplateEmail error:', (error as Error).message)
  }
}
