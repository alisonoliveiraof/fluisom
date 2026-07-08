import { getOrderById, updateOrder, getAdminSetting } from '../services/supabase.service.js'
import {
  createPixPayment,
  createCardPayment,
  fetchMercadoPagoPayment,
  isPaymentApproved,
  isPaymentPending,
  isPaymentRejected,
  isPaymentRefunded,
  verifyWebhookSignature,
} from '../services/mercadopago.service.js'

async function resolvePaymentAmount(order) {
  const adminPrice = Number(await getAdminSetting('price_brl'))
  if (Number.isFinite(adminPrice) && adminPrice > 0) return adminPrice
  const orderAmount = Number(order.payment_amount)
  if (Number.isFinite(orderAmount) && orderAmount > 0) return orderAmount
  return 47.9
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function paymentStatusMessage(mpPayment) {
  if (isPaymentApproved(mpPayment)) return 'Pagamento aprovado'
  if (isPaymentPending(mpPayment)) return 'Aguardando confirmação do pagamento'
  if (isPaymentRejected(mpPayment)) {
    return mpPayment.status_detail || 'Pagamento não aprovado'
  }
  return 'Status do pagamento desconhecido'
}

export async function markOrderAsPaid(orderId, { paymentId, paymentMethod, mpPayment } = {}) {
  const order = await getOrderById(orderId)
  if (order.payment_status === 'paid') {
    return order
  }

  return updateOrder(orderId, {
    payment_status: 'paid',
    payment_id: paymentId ? String(paymentId) : order.payment_id,
    payment_method: paymentMethod || order.payment_method,
    status: order.status === 'delivered' ? 'delivered' : 'paid',
    paid_at: new Date().toISOString(),
  })
}

export async function markOrderAsRefunded(orderId) {
  const order = await getOrderById(orderId)
  if (order.payment_status === 'refunded') {
    return order
  }
  return updateOrder(orderId, {
    payment_status: 'refunded',
  })
}

async function ensurePayableOrder(orderId) {
  const order = await getOrderById(orderId)

  if (order.payment_status === 'paid') {
    const err = new Error('Este pedido já foi pago')
    err.statusCode = 409
    err.code = 'ALREADY_PAID'
    throw err
  }

  if (!['music_ready', 'preview_shown', 'payment_pending'].includes(order.status)) {
    const err = new Error('Este pedido ainda não está pronto para pagamento')
    err.statusCode = 400
    err.code = 'ORDER_NOT_READY'
    throw err
  }

  if (!order.email || !order.full_name) {
    const err = new Error('Complete seus dados de contato antes do pagamento')
    err.statusCode = 400
    err.code = 'CONTACT_REQUIRED'
    throw err
  }

  return order
}

export async function createOrderPayment(req, res, next) {
  try {
    const order = await ensurePayableOrder(req.params.orderId)
    const amount = await resolvePaymentAmount(order)
    const { method, cpf, cardToken, paymentMethodId, issuerId, installments } = req.body

    if (!['pix', 'card'].includes(method)) {
      return res.status(400).json({ error: true, message: 'Método de pagamento inválido', code: 'INVALID_METHOD' })
    }

    const doc = digitsOnly(cpf)
    if (doc.length < 11) {
      return res.status(400).json({ error: true, message: 'Informe um CPF/CNPJ válido', code: 'INVALID_CPF' })
    }

    const payerData = {
      email: order.email,
      fullName: order.full_name,
      cpf: doc,
    }

    await updateOrder(order.id, {
      payment_amount: amount,
      payment_method: method,
      payment_status: 'pending',
      status: 'payment_pending',
    })

    if (method === 'pix') {
      const pix = await createPixPayment(order, amount, payerData)
      await updateOrder(order.id, { payment_id: pix.paymentId })

      return res.json({
        orderId: order.id,
        method: 'pix',
        amount,
        paymentId: pix.paymentId,
        status: pix.status,
        statusDetail: pix.statusDetail,
        qrCode: pix.qrCode,
        qrCodeBase64: pix.qrCodeBase64,
        ticketUrl: pix.ticketUrl,
        expiresAt: pix.expiresAt,
      })
    }

    if (!cardToken || !paymentMethodId) {
      return res.status(400).json({ error: true, message: 'Dados do cartão inválidos', code: 'INVALID_CARD' })
    }

    const card = await createCardPayment(order, amount, payerData, {
      token: cardToken,
      paymentMethodId,
      issuerId,
      installments: installments || 1,
      cpf: doc,
    })

    await updateOrder(order.id, { payment_id: card.paymentId })

    if (isPaymentApproved({ status: card.status })) {
      await markOrderAsPaid(order.id, {
        paymentId: card.paymentId,
        paymentMethod: 'card',
      })
    }

    return res.json({
      orderId: order.id,
      method: 'card',
      amount,
      paymentId: card.paymentId,
      status: card.status,
      statusDetail: card.statusDetail,
      paid: card.status === 'approved',
    })
  } catch (err) {
    const mpDetail = err?.cause?.[0]?.description || err?.cause?.message || err?.message
    if (mpDetail) err.message = mpDetail
    if (err?.message && err.message.includes('MERCADOPAGO_ACCESS_TOKEN')) {
      err.statusCode = 503
      err.code = 'PAYMENT_NOT_CONFIGURED'
    }
    next(err)
  }
}

export async function getOrderPaymentStatus(req, res, next) {
  try {
    const order = await getOrderById(req.params.orderId)

    if (order.payment_status === 'refunded') {
      return res.json({
        orderId: order.id,
        paid: false,
        status: 'refunded',
        paymentStatus: 'refunded',
        message: 'Pagamento reembolsado',
      })
    }

    if (order.payment_status === 'paid') {
      return res.json({
        orderId: order.id,
        paid: true,
        status: 'approved',
        paymentStatus: 'paid',
        message: 'Pagamento aprovado',
      })
    }

    if (!order.payment_id) {
      return res.json({
        orderId: order.id,
        paid: false,
        status: 'not_started',
        paymentStatus: order.payment_status || 'unpaid',
        message: 'Nenhum pagamento iniciado',
      })
    }

    const mpPayment = await fetchMercadoPagoPayment(order.payment_id)

    if (isPaymentApproved(mpPayment)) {
      await markOrderAsPaid(order.id, {
        paymentId: order.payment_id,
        paymentMethod: order.payment_method,
        mpPayment,
      })
    } else if (isPaymentRejected(mpPayment)) {
      await updateOrder(order.id, { payment_status: 'failed' })
    } else if (isPaymentPending(mpPayment)) {
      await updateOrder(order.id, { payment_status: 'pending' })
    }

    res.json({
      orderId: order.id,
      paid: isPaymentApproved(mpPayment),
      status: mpPayment.status,
      statusDetail: mpPayment.status_detail,
      paymentStatus: isPaymentApproved(mpPayment) ? 'paid' : order.payment_status,
      message: paymentStatusMessage(mpPayment),
    })
  } catch (err) {
    next(err)
  }
}

export async function handleMercadoPagoWebhook(req, res) {
  try {
    if (!verifyWebhookSignature(req)) {
      console.warn('[FLUISOM] Webhook Mercado Pago: assinatura inválida')
      return res.status(401).json({ received: false })
    }

    const paymentId =
      req.body?.data?.id
      || req.query?.['data.id']
      || req.query?.id

    if (!paymentId) {
      return res.status(200).json({ received: true })
    }

    const mpPayment = await fetchMercadoPagoPayment(paymentId)
    const orderId = mpPayment?.external_reference

    if (!orderId) {
      return res.status(200).json({ received: true })
    }

    if (isPaymentRefunded(mpPayment)) {
      await markOrderAsRefunded(orderId)
    } else if (isPaymentApproved(mpPayment)) {
      await markOrderAsPaid(orderId, {
        paymentId,
        paymentMethod: mpPayment.payment_method_id === 'pix' ? 'pix' : 'card',
        mpPayment,
      })
    } else if (isPaymentRejected(mpPayment)) {
      await updateOrder(orderId, { payment_status: 'failed' })
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('[FLUISOM] Webhook Mercado Pago:', err.message)
    res.status(200).json({ received: true })
  }
}
