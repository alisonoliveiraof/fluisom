const ONES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const TEENS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']

export function numberToWordsPt(n) {
  if (n === 0) return 'zero'
  if (n < 0) return `menos ${numberToWordsPt(Math.abs(n))}`
  if (n < 10) return ONES[n]
  if (n < 20) return TEENS[n - 10]
  if (n < 100) {
    const ten = Math.floor(n / 10)
    const one = n % 10
    return one ? `${TENS[ten]} e ${ONES[one]}` : TENS[ten]
  }
  if (n < 1000) {
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    const hundredWord = hundred === 1 ? 'cem' : `${ONES[hundred]}centos`
    return rest ? `${hundredWord} e ${numberToWordsPt(rest)}` : hundredWord
  }
  return String(n)
}

export function formatCurrencyBrl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDatePt(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date))
}
