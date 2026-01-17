import { companyName } from '../lib/globalType'

interface AdminPaymentItem {
  type: 'course' | 'product' | 'trip'
  title: string
  quantity?: number
  price: number
}

interface AdminPaymentNotificationProps {
  userEmail: string
  totalAmount: string
  items: AdminPaymentItem[]
  paymentId: string
  paymentDate: string
}

const sendAdminPaymentNotification = ({
  userEmail,
  totalAmount,
  items,
  paymentId,
  paymentDate,
}: AdminPaymentNotificationProps): string => {
  const itemsHtml = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 16px; text-align: left;">
        <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; background-color: #dbeafe; color: #1e40af; font-size: 12px; font-weight: 600; text-transform: uppercase;">
          ${item.type}
        </span>
      </td>
      <td style="padding: 12px 16px; text-align: left; color: #111827; font-size: 14px; font-weight: 500;">
        ${item.title}
      </td>
      <td style="padding: 12px 16px; text-align: center; color: #6b7280; font-size: 14px;">
        ${item.quantity || 1}
      </td>
      <td style="padding: 12px 16px; text-align: right; color: #111827; font-size: 14px; font-weight: 500;">
        $${item.price.toFixed(2)}
      </td>
    </tr>
  `,
    )
    .join('')

  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: auto; padding: 30px 16px; background-color: #f4f4f5;">
      <div style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); overflow: hidden;">
        
        <header style="padding: 32px; border-bottom: 2px solid #3b82f6; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
          <h1 style="margin: 0; font-size: 28px; color: #ffffff; font-weight: 700;">New Payment Received</h1>
          <p style="margin-top: 8px; font-size: 14px; color: #dbeafe;">Admin Notification - ${companyName}</p>
        </header>

        <section style="padding: 28px 32px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
            <div style="padding: 16px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; font-size: 12px; color: #0c4a6e; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Payment ID</p>
              <p style="margin: 0; font-size: 15px; color: #111827; font-weight: 600; word-break: break-all;">${paymentId}</p>
            </div>
            <div style="padding: 16px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
              <p style="margin: 0; font-size: 12px; color: #065f46; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Total Amount</p>
              <p style="margin: 0; font-size: 24px; color: #10b981; font-weight: 700;">$${totalAmount}</p>
            </div>
          </div>

          <div style="margin-bottom: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Customer Email</p>
            <p style="margin: 0; font-size: 15px; color: #111827;">${userEmail}</p>
          </div>

          <div style="margin-bottom: 24px; padding: 16px; background-color: #f3e8ff; border-radius: 8px; border-left: 4px solid #a855f7;">
            <p style="margin: 0; font-size: 12px; color: #581c87; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Payment Date</p>
            <p style="margin: 0; font-size: 15px; color: #111827;">${paymentDate}</p>
          </div>
        </section>

        <section style="padding: 28px 32px;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827; font-weight: 600;">Items Purchased</h2>
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
            <thead>
              <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase;">Type</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase;">Title</th>
                <th style="padding: 12px 16px; text-align: center; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase;">Qty</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </section>

        <section style="padding: 28px 32px; background-color: #f9fafb; border-top: 2px solid #e5e7eb;">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
            <div style="text-align: right; min-width: 300px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
                <span style="font-size: 14px; color: #6b7280;">Subtotal:</span>
                <span style="font-size: 14px; color: #111827; font-weight: 600;">$${totalAmount}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 16px; color: #111827; font-weight: 700;">Total Paid:</span>
                <span style="font-size: 20px; color: #10b981; font-weight: 700;">$${totalAmount}</span>
              </div>
            </div>
          </div>
        </section>

        <footer style="padding: 24px 32px; background-color: #111827; text-align: center; border-top: 1px solid #374151;">
          <p style="margin: 0; font-size: 13px; color: #d1d5db;">
            This is an automated notification from <strong style="color: #ffffff;">${companyName}</strong>
          </p>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
            &copy; 2025 ${companyName}. All rights reserved.
          </p>
        </footer>

      </div>
    </div>
  `
}

export default sendAdminPaymentNotification
