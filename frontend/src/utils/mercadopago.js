import { loadMercadoPago } from '@mercadopago/sdk-js'

let mpInstance = null

export async function getMercadoPago() {
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY
  if (!publicKey) {
    throw new Error('Pagamento indisponível no momento. Tente novamente em instantes.')
  }

  if (!mpInstance) {
    await loadMercadoPago()
    mpInstance = new window.MercadoPago(publicKey, { locale: 'pt-BR' })
  }

  return mpInstance
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

export async function createCardToken(payment) {
  const mp = await getMercadoPago()
  const [month, year] = String(payment.cardExpiry || '').split('/')
  const cardNumber = digitsOnly(payment.cardNumber)
  const cpf = digitsOnly(payment.cardCpf || payment.cpf)

  const result = await mp.createCardToken({
    cardNumber,
    cardholderName: payment.cardName,
    cardExpirationMonth: month,
    cardExpirationYear: year?.length === 2 ? `20${year}` : year,
    securityCode: payment.cardCvv,
    identificationType: cpf.length > 11 ? 'CNPJ' : 'CPF',
    identificationNumber: cpf,
  })

  return {
    token: result.id,
    paymentMethodId: result.payment_method_id,
    issuerId: result.issuer_id,
  }
}
