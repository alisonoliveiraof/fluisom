import { randomUUID, createHmac } from 'node:crypto'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { env } from '../config/env.js'

let paymentClient = null

function getPaymentClient() {
  if (!env.mercadoPagoAccessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado')
  }
  if (!paymentClient) {
    const config = new MercadoPagoConfig({ accessToken: env.mercadoPagoAccessToken })
    paymentClient = new Payment(config)
  }
  return paymentClient
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || 'Cliente',
    lastName: parts.slice(1).join(' ') || 'Fluisom',
  }
}

function buildPayer({ email, fullName, cpf }) {
  const { firstName, lastName } = splitName(fullName)
  const payer = {
    email: String(email || '').trim(),
    first_name: firstName,
    last_name: lastName,
  }

  const doc = digitsOnly(cpf)
  if (doc.length >= 11) {
    payer.identification = {
      type: doc.length > 11 ? 'CNPJ' : 'CPF',
      number: doc,
    }
  }

  return payer
}

function buildDescription(order) {
  const name = order.honored_name?.trim() || 'homenageado'
  return `Fluisom — Música personalizada para ${name}`
}

function notificationUrl() {
  return `${env.backendUrl}/api/webhooks/mercadopago`
}

function mapPixResponse(mpPayment) {
  const tx = mpPayment?.point_of_interaction?.transaction_data || {}
  return {
    paymentId: String(mpPayment.id),
    status: mpPayment.status,
    statusDetail: mpPayment.status_detail,
    qrCode: tx.qr_code || null,
    qrCodeBase64: tx.qr_code_base64 || null,
    ticketUrl: tx.ticket_url || null,
    expiresAt: mpPayment.date_of_expiration || null,
  }
}

function mapCardResponse(mpPayment) {
  return {
    paymentId: String(mpPayment.id),
    status: mpPayment.status,
    statusDetail: mpPayment.status_detail,
  }
}

export async function createPixPayment(order, amount, payerData) {
  const client = getPaymentClient()
  const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const result = await client.create({
    body: {
      transaction_amount: Number(amount),
      description: buildDescription(order),
      payment_method_id: 'pix',
      external_reference: order.id,
      notification_url: notificationUrl(),
      date_of_expiration: expiration,
      payer: buildPayer(payerData),
    },
    requestOptions: { idempotencyKey: randomUUID() },
  })

  return mapPixResponse(result)
}

export async function createCardPayment(order, amount, payerData, cardData) {
  const client = getPaymentClient()

  const body = {
    transaction_amount: Number(amount),
    token: cardData.token,
    description: buildDescription(order),
    installments: Number(cardData.installments) || 1,
    payment_method_id: cardData.paymentMethodId,
    external_reference: order.id,
    notification_url: notificationUrl(),
    payer: {
      ...buildPayer({ ...payerData, cpf: cardData.cpf || payerData.cpf }),
      ...(cardData.issuerId ? { issuer_id: cardData.issuerId } : {}),
    },
  }

  const result = await client.create({
    body,
    requestOptions: { idempotencyKey: randomUUID() },
  })

  return mapCardResponse(result)
}

export async function fetchMercadoPagoPayment(paymentId) {
  const client = getPaymentClient()
  return client.get({ id: paymentId })
}

export function isPaymentApproved(mpPayment) {
  return mpPayment?.status === 'approved'
}

export function isPaymentPending(mpPayment) {
  return ['pending', 'in_process', 'authorized'].includes(mpPayment?.status)
}

export function isPaymentRejected(mpPayment) {
  return ['rejected', 'cancelled'].includes(mpPayment?.status)
}

export function isPaymentRefunded(mpPayment) {
  if (['refunded', 'charged_back'].includes(mpPayment?.status)) return true
  // Reembolso parcial ou total pode manter status "approved" com refunds preenchido
  if (Array.isArray(mpPayment?.refunds) && mpPayment.refunds.length > 0) return true
  return false
}

export function verifyWebhookSignature(req) {
  const secret = env.mercadoPagoWebhookSecret
  if (!secret) return true

  const xSignature = req.headers['x-signature']
  const xRequestId = req.headers['x-request-id']
  if (!xSignature || !xRequestId) return false

  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key?.trim(), value?.trim()]
    }),
  )

  const ts = parts.ts
  const receivedHash = parts.v1
  if (!ts || !receivedHash) return false

  const dataId = req.query?.['data.id'] || req.body?.data?.id || ''
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const computed = createHmac('sha256', secret).update(manifest).digest('hex')

  return computed === receivedHash
}
