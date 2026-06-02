<script setup>
import { useQuiz } from '../../composables/useQuiz'
import FluisomLogo from '../../components/FluisomLogo.vue'

const {
  form,
  payment,
  honoredDisplay,
  genreLabel,
  relationshipLabel,
  orderId,
  cardFlipped,
  cardLastFour,
  qrPattern,
  onCpfInput,
  onCardNumberInput,
  onExpiryInput,
  onCvvInput,
  confirmPayment,
  goBack,
  goToStep,
} = useQuiz()
</script>

<template>
  <section class="step step-payment">
    <div class="payment-layout">
      <aside class="payment-summary">
        <div class="summary-header">
          <FluisomLogo small />
          <button type="button" class="link-review" @click="goToStep(1)">Revisar pedido</button>
        </div>
        <h2 class="summary-title">Resumo do Pedido</h2>
        <div class="summary-row"><span class="summary-key">Homenageado(a)</span><span class="summary-val">{{ honoredDisplay }}</span></div>
        <div class="summary-row"><span class="summary-key">Relacionamento</span><span class="summary-val">{{ relationshipLabel }}</span></div>
        <div class="summary-row"><span class="summary-key">Gênero</span><span class="summary-val">{{ genreLabel }}</span></div>
        <div class="summary-row">
          <span class="summary-key">Voz</span>
          <span class="summary-val">{{ form.voice === 'masculino' ? 'Masculina' : form.voice === 'feminino' ? 'Feminina' : '—' }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-key">Entrega</span>
          <span class="badge-delivery">Imediata</span>
        </div>
        <div class="summary-divider" />
        <div class="summary-total">R$ 47,90</div>
        <p class="order-id-sm">{{ orderId }}</p>
      </aside>

      <div class="payment-form">
        <div class="payment-tabs">
          <button type="button" class="tab" :class="{ active: payment.method === 'pix' }" @click="payment.method = 'pix'">PIX</button>
          <button type="button" class="tab" :class="{ active: payment.method === 'card' }" @click="payment.method = 'card'">Cartão</button>
        </div>

        <template v-if="payment.method === 'pix'">
          <div class="pix-banner">⚡ Pagamentos via PIX são processados instantaneamente. Você receberá um QR Code para efetuar o pagamento.</div>
          <div class="field-group">
            <label class="label">E-mail</label>
            <input v-model="form.email" type="email" class="input" readonly />
          </div>
          <div class="field-group">
            <label class="label">CPF/CNPJ</label>
            <input :value="payment.cpf" type="text" class="input" placeholder="000.000.000-00" @input="onCpfInput($event, 'cpf')" />
          </div>
          <div class="field-group">
            <label class="label">Nome</label>
            <input v-model="form.fullName" type="text" class="input" readonly />
          </div>
          <div class="qr-area">
            <div class="qr-grid">
              <span v-for="(filled, i) in qrPattern" :key="i" class="qr-cell" :class="{ filled }" />
            </div>
          </div>
          <p class="hint center">O QR Code aparecerá aqui após confirmar</p>
        </template>

        <template v-else>
          <div class="card-3d-wrap" :class="{ flipped: cardFlipped }">
            <div class="card-3d">
              <div class="card-face card-front">
                <div class="card-chip" />
                <p class="card-number">•••• •••• •••• {{ cardLastFour }}</p>
                <div class="card-bottom">
                  <span>{{ payment.cardName || 'NOME NO CARTÃO' }}</span>
                  <span>{{ payment.cardExpiry || 'MM/AA' }}</span>
                </div>
                <div class="card-brand"><span /><span /></div>
              </div>
              <div class="card-face card-back">
                <div class="card-stripe" />
                <p class="card-cvv-line">CVV: {{ payment.cardCvv ? '•'.repeat(payment.cardCvv.length) : '•••' }}</p>
              </div>
            </div>
          </div>
          <div class="field-group">
            <label class="label">Número do cartão</label>
            <input :value="payment.cardNumber" type="text" class="input" placeholder="0000 0000 0000 0000" @input="onCardNumberInput" />
          </div>
          <div class="grid-2">
            <div class="field-group">
              <label class="label">Validade</label>
              <input :value="payment.cardExpiry" type="text" class="input" placeholder="MM/AA" @input="onExpiryInput" />
            </div>
            <div class="field-group">
              <label class="label">CVV</label>
              <input
                :value="payment.cardCvv"
                type="text"
                class="input"
                placeholder="•••"
                @input="onCvvInput"
                @focus="cardFlipped = true"
                @blur="cardFlipped = false"
              />
            </div>
          </div>
          <div class="field-group">
            <label class="label">Nome no cartão</label>
            <input v-model="payment.cardName" type="text" class="input" placeholder="Como está no cartão" />
          </div>
          <div class="field-group">
            <label class="label">CPF do titular</label>
            <input :value="payment.cardCpf" type="text" class="input" placeholder="000.000.000-00" @input="onCpfInput($event, 'cardCpf')" />
          </div>
        </template>

        <button type="button" class="btn-cta" @click="confirmPayment">🔒 Pagar Agora — R$ 47,90</button>
        <p class="payment-secure">🔒 Seu pagamento é protegido pela Stripe. Nunca armazenamos seus dados de cartão.</p>
        <p class="payment-badges">🔒 Pagamento Seguro | 📅 Garantia de 30 dias</p>
      </div>
    </div>

    <nav class="nav">
      <button type="button" class="btn-back" @click="goBack">← Voltar</button>
    </nav>
  </section>
</template>
