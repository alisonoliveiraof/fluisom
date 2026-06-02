plaintext

Copy
Crie um quiz de criação de músicas personalizadas em Vue.js (Composition API + <script setup>), 
em um único arquivo App.vue, sem dependências externas além do Vue 3. 
Visual premium, alegre e emocionalmente envolvente — light mode vibrante, gradientes expressivos, 
animações fluidas. A paleta combina o azul/ciano da marca Fluisom com cores vivas que transmitem 
alegria, emoção e calor humano, sem perder sofisticação.

## PALETA DE CORES (obrigatória)

### Base Fluisom (âncora da identidade)
- Primária: #0099b8 (ciano Fluisom)
- Secundária: #0066a8 (azul Fluisom)
- Gradiente marca: linear-gradient(135deg, #00c9d4, #0066a8)

### Fundo e Superfícies
- Fundo principal: #f7f9ff (branco azulado muito suave)
- Fundo secundário: #eef5fb
- Cards/superfícies: #ffffff
- Border padrão: #daeaf5
- Shadow padrão: 0 4px 24px rgba(0, 153, 184, 0.08)

### Cores Vivas de Apoio (alegria + emoção)
- Coral/Amor: #ff6b6b (vermelho coral vibrante — relacionamentos, amor)
- Âmbar/Energia: #ffb347 (laranja âmbar quente — energia, entusiasmo)
- Violeta/Emoção: #a855f7 (roxo violeta — emoção profunda, memórias)
- Verde/Positividade: #22c55e (verde vibrante — confirmações, sucesso, positividade)
- Rosa/Afeto: #f472b6 (rosa quente — afeto, carinho, surpresa)
- Dourado/Especial: #f59e0b (dourado — estrelas, premium, especial)

### Gradientes Temáticos por Seção
- Hero/Header accent: linear-gradient(135deg, #00c9d4 0%, #a855f7 100%)
- Cards de relacionamento hover: linear-gradient(135deg, #ff6b6b22, #ffb34722)
- Step badge ativo: linear-gradient(135deg, #00c9d4, #0066a8)
- Garantias: linear-gradient(135deg, #22c55e15, #00c9d415)
- Depoimentos accent: linear-gradient(135deg, #f472b615, #a855f715)
- CTA principal: linear-gradient(135deg, #ff6b6b, #ffb347) — botão de compra quente e chamativo
- Botão próximo: linear-gradient(135deg, #00c9d4, #0066a8)
- Confirmação sucesso: linear-gradient(135deg, #22c55e, #00c9d4)

### Texto
- Principal: #0d2137 (azul escuro Fluisom)
- Secundário: #4a6a80
- Terciário/hints: #8aaabb
- Destaque nome: #0099b8 (ciano, font-weight 700)
- Erro: #ef4444
- Sucesso: #22c55e

### Estados Interativos
- Input focus: border #0099b8, shadow 0 0 0 3px rgba(0,153,184,0.15)
- Card selecionado: border 2px solid #0099b8, background rgba(0,153,184,0.07), shadow 0 0 0 4px rgba(0,153,184,0.12)
- Botão CTA compra hover: brightness(1.08) + translateY(-2px) + shadow 0 12px 32px rgba(255,107,107,0.4)
- Botão próximo hover: brightness(1.08) + translateY(-1px) + shadow 0 8px 24px rgba(0,153,184,0.35)

## TIPOGRAFIA
- Font: 'Inter', sans-serif (importar via @import no topo do <style>)
- Títulos: 2rem–2.4rem, font-weight 800, color #0d2137, line-height 1.2
- Subtítulos: 1rem–1.05rem, color #4a6a80, line-height 1.65
- Labels: 0.875rem, font-weight 600, color #0d2137, letter-spacing 0.01em
- Hints: 0.8rem, color #8aaabb, line-height 1.5
- Botão CTA: 1.05rem, font-weight 800, letter-spacing 0.02em
- Step badge: 0.72rem, font-weight 700, letter-spacing 0.05em, uppercase

## LAYOUT GERAL E ATMOSFERA VISUAL
- Fundo: #f7f9ff com gradiente animado muito sutil (background-size 400%, animation 25s infinite alternate)
- 4 orbs decorativos com blur pesado (filter blur 80px), posicionados nos cantos:
  - Orb 1 (topo esquerdo): #00c9d4, opacity 0.12, 300px, animação float 14s
  - Orb 2 (topo direito): #a855f7, opacity 0.08, 250px, animação float 18s reverse
  - Orb 3 (base esquerda): #ff6b6b, opacity 0.07, 200px, animação float 16s
  - Orb 4 (base direita): #ffb347, opacity 0.08, 220px, animação float 20s reverse
- Header fixo: background rgba(255,255,255,0.88), backdrop-filter blur(20px), border-bottom 1px solid #daeaf5, shadow 0 2px 16px rgba(0,153,184,0.07)
- Conteúdo: max-width 720px, centralizado, padding 24px mobile / 48px desktop
- Transições: <transition name="slide-fade" mode="out-in"> — slide 24px + fade 0.3s ease
- Cards hover: translateY(-4px), shadow 0 12px 32px rgba(0,153,184,0.14), border-color #0099b8
- Scrollbar: thumb #b0d4e8, track #f0f8ff, width 6px, border-radius 8px

## ESTRUTURA DE DADOS (reactive)
```js
const form = reactive({
  relationship: '',
  customRelationship: '',
  honoredName: '',
  specialQualities: '',
  specialMoments: '',
  specialMessage: '',
  genre: '',
  voice: '',
  fullName: '',
  email: '',
  whatsapp: '',
  discreteMode: false
})

const payment = reactive({
  method: 'pix',
  cpf: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  cardName: '',
  cardCpf: '',
  cardCpfType: 'cpf'
})

const currentStep = ref(1)
const orderId = ref('FS-' + Math.random().toString(36).substr(2,8).toUpperCase())
const audioPlaying = ref(false)
const audioProgress = ref(0)
const videoPlaying = ref(false)
const videoProgress = ref(0)
const cardFlipped = ref(false)

const waveHeights = Array.from({ length: 40 }, () => Math.floor(Math.random() * 40 + 8))
const qrPattern = Array.from({ length: 64 }, () => Math.random() > 0.45)

const genreLabel = computed(() => {
  const g = genres.find(x => x.value === form.genre)
  return g ? g.label : '—'
})

const progressPercent = computed(() => ((currentStep.value - 1) / 6) * 100)
VALIDAÇÃO POR STEP
canProceed(step):
Step 1: relationship + (se 'outro': customRelationship) + honoredName
Step 2: specialQualities.length >= 20 + specialMoments.length >= 20
Step 3: genre + voice
Step 4: sempre true
Step 5: fullName + email válido (regex /^[^\s@]+@[^\s@]+.[^\s@]+$/)
Botão desabilitado: opacity 0.45, cursor not-allowed, pointer-events none
HEADER (fixo, presente em todos os steps)
Logo SVG Fluisom: ícone de ondas sonoras + barras de equalizer em gradiente #00c9d4 → #0066a8, texto "fluisom" em font-weight 800, color #0d2137
Progress section (direita no desktop, abaixo no mobile):
7 dots: 8px cada
done: background #0099b8, scale(1)
active: background #0099b8, scale(1.3), ring animado (box-shadow 0 0 0 4px rgba(0,153,184,0.2), pulse 1.5s infinite)
inactive: background #daeaf5
Barra linear: track #e8f4fb, fill gradiente #00c9d4 → #0066a8, height 3px, transition width 0.5s ease
Label "Passo X de 7": font-size 0.75rem, color #4a6a80
STEP 1 — "Para quem é essa música?" (Passo 1 de 7)
Acima do título: pill decorativa com gradiente coral→âmbar + ícone 🎵
Título: "Para quem é essa música?"
Subtítulo: "Escolha o tipo de relacionamento para personalizar sua canção"

Grid 3 colunas (mobile: 2 colunas), gap 12px:
[
{ value: 'esposo', emoji: '💍', label: 'Esposo(a)', color: '#ff6b6b' },
{ value: 'namorado', emoji: '❤️', label: 'Namorado(a)', color: '#f472b6' },
{ value: 'reconciliacao', emoji: '🕊️', label: 'Reconciliação', color: '#a855f7' },
{ value: 'noivo', emoji: '💒', label: 'Noivo(a)', color: '#ff6b6b' },
{ value: 'crush', emoji: '🥰', label: 'Crush/Paixão', color: '#f472b6' },
{ value: 'amigo', emoji: '🤝', label: 'Amigo(a)', color: '#ffb347' },
{ value: 'mae', emoji: '🌸', label: 'Mãe', color: '#f472b6' },
{ value: 'pai', emoji: '🦁', label: 'Pai', color: '#ffb347' },
{ value: 'filho', emoji: '⭐', label: 'Filho(a)', color: '#f59e0b' },
{ value: 'irmao', emoji: '🫂', label: 'Irmão(ã)', color: '#a855f7' },
{ value: 'eu', emoji: '🎯', label: 'Eu mesmo', color: '#0099b8' },
{ value: 'outro', emoji: '✨', label: 'Outro', color: '#0099b8' }
]

Card base: background #ffffff, border 1px solid #daeaf5, border-radius 16px, padding 20px 14px, text-align center, cursor pointer, transition all 0.22s ease
Emoji: font-size 2rem, display block, margin-bottom 8px
Label: font-size 0.88rem, font-weight 600, color #0d2137
Hover: translateY(-4px), border-color do color temático do card, shadow 0 8px 24px [color]22
Selecionado: border 2px solid #0099b8, background rgba(0,153,184,0.07), shadow 0 0 0 4px rgba(0,153,184,0.12)
Dot colorido no topo esquerdo: 8px, background color temático do card
Ícone ✓ no canto superior direito: círculo 20px gradiente ciano, ✓ branco 11px
Animação de entrada: stagger opacity 0 + translateY(16px) → 1 + 0, delay i*0.04s
Campo "Outro" (transition fade-in):

Label: "Digite o Relacionamento ou Ocasião *"
Placeholder: "Ex.: Casamento, Chá Revelação, Pet, Formatura…"
Container com borda esquerda 3px solid #a855f7 (cor do "Outro")
Campo nome:

Label: "Qual é o nome da pessoa homenageada? *"
Placeholder: "Ex.: Maria, João, Ana e Marcos"
Hint: "💡 Use a acentuação correta para garantir a pronúncia (ex: Thaís, Jéssica)"
Container com ícone 👤 à esquerda no input
Navegação: "Próximo →" (gradiente ciano) alinhado à direita

STEP 2 — "Sua história, memórias e datas favoritas" (Passo 2 de 7)
Pill decorativa: gradiente violeta→rosa + ícone 💜
Título: "Sua história, memórias e datas favoritas"
Subtítulo: "Quanto mais detalhes você escrever, melhor a letra que criaremos! Fique tranquilo(a), você pode colocar mais informações antes de finalizar o pedido."

Campo 1 — obrigatório, maxlength 500:

Label: "O que torna [form.honoredName] tão especial para você? *"
[form.honoredName] em cor #ff6b6b (coral), font-weight 700
Textarea: rows 5, placeholder multilinha
Barra de progresso + contador:
Track: #eef5fb, height 5px, border-radius 5px
0–19: fill #ef4444, mensagem "Conta mais um pouquinho… (faltam X)" em #ef4444
20–399: fill #ffb347, mensagem "Ótimo! Continue escrevendo..." em #f59e0b
400–500: fill #22c55e, mensagem "Perfeito! Temos material de sobra 🎉" em #22c55e
Transição de cor da barra: transition background 0.4s ease
Contagem "X/500" alinhada à direita, color #8aaabb
Campo 2 — "Momentos especiais juntos *", mesma lógica, maxlength 500:

Label com [form.honoredName] em #a855f7 (violeta)
Campo 3 — "Uma mensagem especial":

Badge "opcional" pill: background #fff0f9, color #f472b6, border 1px solid #fbc8e8
Textarea rows 4, maxlength 400
Hint: "💌 Escreva do fundo do coração — essa parte costuma emocionar mais"
Navegação: "← Voltar" + "Próximo →"

STEP 3 — "Escolha um Gênero Musical" (Passo 3 de 7)
Pill decorativa: gradiente ciano→violeta + ícone 🎸
Título: "Escolha um Gênero Musical"
Subtítulo: "Qual o estilo mais combina? Selecione o estilo musical para sua canção"

Grid 4 colunas (mobile: 2 colunas), gap 10px:
[
{ value: 'romantico', emoji: '🌹', label: 'Romântico', color: '#ff6b6b' },
{ value: 'gospel', emoji: '✝️', label: 'Gospel', color: '#f59e0b' },
{ value: 'sertanejo', emoji: '🤠', label: 'Sertanejo', color: '#ffb347' },
{ value: 'samba', emoji: '🥁', label: 'Samba/Pagode', color: '#ff6b6b' },
{ value: 'forro', emoji: '🪗', label: 'Forró', color: '#ffb347' },
{ value: 'pop', emoji: '🎤', label: 'Pop', color: '#f472b6' },
{ value: 'mpb', emoji: '🎸', label: 'MPB', color: '#0099b8' },
{ value: 'infantil', emoji: '🧸', label: 'Infantil', color: '#22c55e' },
{ value: 'rock', emoji: '🤘', label: 'Rock', color: '#a855f7' },
{ value: 'reggae', emoji: '🌿', label: 'Reggae', color: '#22c55e' },
{ value: 'eletronico', emoji: '🎛️', label: 'Eletrônico', color: '#0099b8' },
{ value: 'jazz', emoji: '🎷', label: 'Jazz', color: '#f59e0b' },
{ value: 'hiphop', emoji: '🎧', label: 'Hip-Hop/Rap', color: '#a855f7' },
{ value: 'funk', emoji: '🔊', label: 'Funk', color: '#ff6b6b' }
]

Cards menores: padding 16px 10px, border-radius 14px
Hover: border-color do color temático, shadow [color]25
Selecionado: mesmo padrão do step 1 (borda ciano + fundo ciano suave + check)
Dot colorido temático no topo esquerdo quando selecionado
Divisor decorativo entre grid e seção de voz:

Linha com gradiente coral→ciano→violeta, height 2px, opacity 0.3, border-radius 2px
Seção de voz:

Label: "Qual voz você prefere? *"
Hint: "Recomendamos escolher seu próprio gênero para que os vocais soem mais pessoais"
2 cards lado a lado (flex, gap 16px):
Card Masculino: emoji 🎤 grande (2.5rem), título "Voz Masculina", desc "Tom grave e encorpado"
Accent color: #0066a8
Selecionado: border #0066a8, fundo rgba(0,102,168,0.07)
Card Feminino: emoji 🎵 grande, título "Voz Feminina", desc "Tom claro e delicado"
Accent color: #f472b6
Selecionado: border #f472b6, fundo rgba(244,114,182,0.07)
Ambos: ícone ✓ no canto quando selecionado (cor do accent)
STEP 4 — "Você está quase lá!" (Passo 4 de 7)
Layout centralizado, text-align center.

Banner emocional no topo:

Background: linear-gradient(135deg, #fff0f9, #f0f8ff)
Border: 1px solid #fbc8e8
Border-radius 16px, padding 20px
Texto: "🎶 Sua música está sendo preparada com carinho especial para [form.honoredName]"
Color: #a855f7, font-weight 600
Ícone animado: 🎶 font-size 4rem, animação bounce (translateY -10px, 2s ease-in-out infinite)

Título: "Você está quase lá!"
Subtítulo: "A um passo de presentear [form.honoredName] com uma música que vai fluir para sempre em seu coração..."

Player de vídeo mockado:

Container: aspect-ratio 16/9, border-radius 20px, overflow hidden
Background: linear-gradient(135deg, #e8f4fb 0%, #f0e8fb 50%, #fde8f0 100%)
Border: 1px solid #daeaf5, shadow 0 12px 40px rgba(0,153,184,0.12)
Overlay central com botão play:
Círculo 72px, background: linear-gradient(135deg, #ff6b6b, #ffb347)
Ícone ▶ branco 28px
Hover: scale(1.1), shadow 0 8px 24px rgba(255,107,107,0.45)
Ao clicar: trocar para ⏸, iniciar setInterval (videoProgress += 0.5 a cada 200ms)
Badge "3:00" canto inferior direito: background rgba(13,33,55,0.6), color white, border-radius 6px
Label "Como funciona a entrega" canto inferior esquerdo: mesma pill
Barra de progresso base: track rgba(255,255,255,0.4), fill gradiente coral→âmbar, height 4px
Waveform decorativo na base: 20 barras, color rgba(255,107,107,0.4), animação pulse assíncrona
STEP 5 — "Sua Música Personalizada está Pronta!" (Passo 5 de 7)
Banner celebratório no topo:

Background: linear-gradient(135deg, #fff8e8, #f0fff8)
Border: 1px solid #fde68a
Texto: "✨ Sua prévia exclusiva está pronta! Ouça antes de finalizar."
Color: #f59e0b, font-weight 600
Player de áudio mockado:

Container: background #ffffff, border 1px solid #daeaf5, border-radius 20px, padding 28px
Shadow: 0 8px 32px rgba(0,153,184,0.10)
Waveform: 40 barras, alturas aleatórias (8–48px), gap 3px
Tocadas: background linear-gradient(to top, #ff6b6b, #ffb347) — gradiente coral→âmbar
Futuras: background #e8f4fb
Border-radius 3px, transition background 0.3s
Controles: flex, align-items center, gap 16px
Botão play/pause: 48px, background linear-gradient(135deg, #00c9d4, #0066a8), border-radius 50%, ícone branco
Nome: "Prévia — [form.honoredName]" font-weight 700, color #0d2137
Tempo: "0:00 / 0:30" color #8aaabb, font-family monospace
Barra de progresso: track #eef5fb, fill linear-gradient(90deg, #ff6b6b, #ffb347), height 5px, border-radius 5px, cursor pointer
Overlay de bloqueio:
Background: rgba(247,249,255,0.93), backdrop-filter blur(6px)
Ícone 🔒 font-size 2.5rem, color #0099b8
Título: "Prévia Exclusiva" font-weight 700, color #0d2137
Desc: "Versão completa disponível após o pagamento" color #4a6a80
Ao clicar play: remover overlay com fade-out, iniciar progresso
Formulário de contato:

Seção com título "📬 Para onde enviamos sua música?" (font-weight 700, color #0d2137)
"Seu nome completo *" — input com ícone 👤 prefixo
"Email *" — input com ícone 📧 prefixo, hint "🔒 Sem spam. Jamais compartilhamos seus dados."
"WhatsApp" — badge pill "recomendado" em verde (#22c55e), prefixo "🇧🇷 +55" com background #f0f8ff
Checkbox modo discreto:

Container: background linear-gradient(135deg, #fff0f9, #f7f9ff), border 1px solid #fbc8e8, border-radius 14px, padding 18px, cursor pointer
Hover: border-color #f472b6
Checkbox custom: 22px, border 2px solid #daeaf5, border-radius 6px
Checked: background linear-gradient(135deg, #f472b6, #a855f7), ícone ✓ branco
Título: "🎁 É um presente surpresa? (Modo Discreto)" font-weight 600, color #0d2137
Desc: color #4a6a80, font-size 0.85rem
Seção de garantias:

Título: "Sua compra é 100% protegida" text-align center, font-weight 700
3 cards em row (mobile: coluna), gap 12px:
Background: linear-gradient(135deg, #f0fff8, #f7f9ff), border 1px solid #bbf7d0, border-radius 14px, padding 20px
Ícone: 2.2rem
Título: font-weight 700, color #0d2137, font-size 0.95rem
Desc: color #4a6a80, font-size 0.85rem
🛡️ "100% Garantia de Satisfação" — "Reembolso total. Sem perguntas, sem burocracia."
📅 "Garantia de 30 dias" — "Tempo de sobra para ouvir e decidir"
✅ "Compra sem risco" — "Nossa prioridade é a sua satisfação"
Botão CTA principal:

Background: linear-gradient(135deg, #ff6b6b, #ffb347) — coral→âmbar (quente, chamativo, ação)
Color: white, largura 100%, height 60px, border-radius 16px
Font-size 1.1rem, font-weight 800, letter-spacing 0.02em
Shadow: 0 6px 24px rgba(255,107,107,0.30)
Hover: brightness(1.08) + translateY(-2px) + shadow 0 12px 32px rgba(255,107,107,0.45)
Ícone 🎵 antes do texto
Texto: "🎵 Continuar para o pagamento — R$ 47,90"
Subtexto: "Pronto para criar algo especial para [form.honoredName]? ✨" (color #4a6a80, text-align center)
Seção de depoimentos:

Background geral: linear-gradient(135deg, #fff8f8, #f8f0ff), border-radius 24px, padding 32px
Título: "❤️ O que os nossos clientes dizem" text-align center, font-weight 800, color #0d2137
Subtítulo: "Histórias reais de quem já presenteou com a Fluisom" color #4a6a80
3 cards (mobile: 1 coluna, desktop: 3 colunas):
Background #ffffff, border-radius 16px, padding 24px
Border-top: 3px solid [cor temática por card]:
Card 1: #ff6b6b (coral — história da mãe)
Card 2: #f472b6 (rosa — história do noivado)
Card 3: #a855f7 (violeta — história do avô)
Shadow: 0 4px 20px rgba(0,0,0,0.06)
Estrelas "★★★★★": color #f59e0b, font-size 1.1rem
Texto: font-style italic, color #4a6a80, line-height 1.65, font-size 0.95rem
Avatar: círculo 44px, gradiente temático do card, color white, font-weight 800, inicial
Nome: font-weight 700, color #0d2137, font-size 0.95rem
Cidade: color #8aaabb, font-size 0.8rem
Card coral — Amanda Costa, Rio de Janeiro, RJ — história da mãe de 80 anos
Card rosa — Gabriel Fernandes, Belo Horizonte, MG — história do noivado
Card violeta — Maria Alice, Salvador, BA — história do avô
STEP 6 — "Pagamento" (Passo 6 de 7)
Layout 2 colunas desktop (40%/60%), coluna única mobile.

Coluna esquerda — Resumo:

Background: linear-gradient(160deg, #f7f9ff, #eef5fb), border 1px solid #daeaf5, border-radius 20px, padding 28px, sticky top 100px
Header: logo SVG Fluisom + link "Revisar pedido" (color #0099b8)
Título "Resumo do Pedido" font-weight 800, color #0d2137
Linhas de resumo: border-bottom 1px solid #eef5fb, padding 12px 0
Key: color #4a6a80, font-size 0.875rem
Val: color #0d2137, font-weight 600
"Entrega: Imediata" — badge: background #f0fff8, color #22c55e, border 1px solid #bbf7d0, border-radius 20px, padding 2px 10px
Divisor: 2px solid #daeaf5
Total: "R$ 47,90" — font-size 2rem, font-weight 900, background linear-gradient(135deg, #ff6b6b, #ffb347), -webkit-background-clip text, color transparent
Order ID: color #8aaabb, font-size 0.75rem
Coluna direita — Formulário:

Background #ffffff, border 1px solid #daeaf5, border-radius 20px, padding 28px, shadow 0 4px 24px rgba(0,153,184,0.07)
Tabs PIX / Cartão:

Container: background #f7f9ff, border-radius 14px, padding 4px, display flex
Tab ativo: background #ffffff, shadow 0 2px 10px rgba(0,153,184,0.12), color #0099b8, font-weight 700, border-radius 11px
Tab inativo: color #4a6a80
Tab PIX:

Banner info: background linear-gradient(135deg, #f0fff8, #f7f9ff), border 1px solid #bbf7d0, border-radius 12px, padding 14px 16px
"⚡ Pagamentos via PIX são processados instantaneamente. Você receberá um QR Code para efetuar o pagamento."
Color #22c55e, font-size 0.875rem, font-weight 600
Campos: E-mail (pré-preenchido), CPF/CNPJ com máscara, Nome (pré-preenchido)
QR Code area: 180x180px centralizado, background #f7f9ff, border 2px dashed #b0d4e8, border-radius 12px
Grid 8x8: células filled em #0099b8 (border-radius 1px), células vazias em #e8f4fb
Hint: "O QR Code aparecerá aqui após confirmar" color #8aaabb
Tab Cartão:

Card visual 3D (perspective 1000px, border-radius 16px, aspect-ratio 1.586):
Frente: background linear-gradient(135deg, #0d2137 0%, #0066a8 60%, #00c9d4 100%), color white, padding 24px
Chip SVG dourado (40x30px)
Número: "•••• •••• •••• " + últimos 4, font-family monospace, font-size 1.3rem, letter-spacing 3px
Nome e validade na base
Bandeira genérica (círculos sobrepostos coral + âmbar, estilo Mastercard) no canto direito
Verso: background linear-gradient(135deg, #0a1a2e, #004d80), faixa magnética preta 40px, CVV mascarado
Flip: rotateY(180deg) ao focar CVV, transition 0.6s cubic-bezier(0.4, 0, 0.2, 1)
Campos: Número (máscara), Validade + CVV (grid 2 col), Nome no cartão, CPF/CNPJ com toggle
Botão pagamento:

"🔒 Pagar Agora — R$ 47,90"
Background: linear-gradient(135deg, #ff6b6b, #ffb347)
Largura 100%, height 58px, border-radius 14px, font-weight 800, color white
Shadow: 0 6px 24px rgba(255,107,107,0.30)
Hover: brightness(1.08) + translateY(-2px) + shadow 0 12px 32px rgba(255,107,107,0.45)
Subtexto: "🔒 Seu pagamento é protegido pela Stripe. Nunca armazenamos seus dados de cartão."
Badges: "🔒 Pagamento Seguro | 📅 Garantia de 30 dias" — color #4a6a80, font-size 0.8rem
STEP 7 — Confirmação (Passo 7 de 7)
Fundo da seção: linear-gradient(135deg, #f0fff8, #f7f9ff, #fff0f9)
Text-align center, padding 60px 24px.

Animação de check SVG (200x200px):

Círculo externo: stroke linear-gradient ciano→verde, stroke-width 4, stroke-dashoffset 283→0 em 0.8s ease-out
Check ✓: stroke #22c55e, stroke-width 5, stroke-dashoffset 100→0 em 0.5s delay 0.6s
Fundo do círculo: fill rgba(34,197,94,0.08)
Confetti decorativo: 12 elementos absolutos com emojis 🎉🎊✨🎶💜❤️ espalhados, animação float-out (opacity 1→0, translateY -60px, 2s) com delays variados, disparados ao entrar no step 7

Título: "Pedido Confirmado! 🎉" font-size 2.2rem, font-weight 900, color #0d2137
Subtítulo: "Sua música para [form.honoredName] está sendo criada com muito carinho." color #4a6a80

Card de resumo:

Background #ffffff, border 1px solid #daeaf5, border-radius 20px, padding 28px, max-width 420px, margin 32px auto
Shadow: 0 8px 32px rgba(0,153,184,0.10)
Linha "📦 Order ID: [orderId]" — font-family monospace, color #0099b8, font-weight 700
Linha "📧 Entrega: [form.email]" — color #0d2137
Linha "⏱️ Prazo: Em breve no seu email" — color #22c55e, font-weight 600
Mensagem: "Você receberá um email em [form.email] assim que sua música estiver pronta." color #4a6a80

Botão "🎵 Criar outra música":

Background transparent, border 2px solid #0099b8, color #0099b8, border-radius 12px, padding 14px 32px, font-weight 700
Hover: background rgba(0,153,184,0.07), translateY(-1px)
Ao clicar: resetar form e payment para valores iniciais, currentStep = 1, scrollTo top
INPUTS — ESTILO PADRÃO
Background: #f8fbfd
Border: 1px solid #daeaf5
Border-radius: 12px
Padding: 14px 16px (ou 14px 16px 14px 44px quando há ícone prefixo)
Color: #0d2137, font-size 1rem
Placeholder: color #aabbc8
Focus: border-color #0099b8, box-shadow 0 0 0 3px rgba(0,153,184,0.13), background #ffffff, outline none
Transition: all 0.2s ease
Textarea: resize vertical, min-height 120px, line-height 1.6
Input com ícone: position relative, ícone absolute left 14px, color #0099b8, font-size 1rem
BOTÕES — PADRÃO
Próximo: gradiente #00c9d4→#0066a8, color white, border-radius 12px, padding 13px 28px, font-weight 700, display flex, align-items center, gap 8px, seta → SVG
Voltar: background #ffffff, border 1px solid #daeaf5, color #4a6a80, border-radius 12px, padding 13px 24px, font-weight 600, hover: border-color #0099b8, color #0099b8
CTA compra: gradiente coral→âmbar (detalhado acima)
Desabilitado: opacity 0.42, cursor not-allowed, pointer-events none
MICRO-INTERAÇÕES E ANIMAÇÕES
@keyframes float: translateY(0)→translateY(-20px)→translateY(0), timing ease-in-out
@keyframes pulse-ring: box-shadow 0 0 0 0 rgba(0,153,184,0.4)→0 0 0 8px transparent, 1.5s infinite
@keyframes bounce: translateY(0)→translateY(-10px)→translateY(0), 2s ease-in-out infinite
@keyframes slide-in-stagger: opacity 0 + translateY(16px)→opacity 1 + translateY(0), delay i*0.04s
@keyframes progress-bar: width 0→X%, transition 0.4s ease
@keyframes confetti-out: opacity 1 + translateY(0)→opacity 0 + translateY(-60px), 2s ease-out
@keyframes card-flip: rotateY(0)→rotateY(180deg), 0.6s cubic-bezier(0.4,0,0.2,1)
Transition entre steps: slide-fade — enter: opacity 0 + translateX(24px)→1+0, leave: 1+0→0+translateX(-24px), 0.28s ease
RESPONSIVIDADE
Mobile first, breakpoint 768px
Grid relacionamentos: 2 col mobile → 3 col desktop
Grid gêneros: 2 col mobile → 4 col desktop
Voz: 1 col mobile → 2 col desktop
Garantias: 1 col mobile → 3 col desktop
Depoimentos: 1 col mobile → 3 col desktop
Pagamento: 1 col mobile → 2 col desktop
Header: empilhado mobile → inline desktop
Padding: 16px mobile → 24px tablet → 48px desktop
Font-size títulos: 1.6rem mobile → 2.2rem desktop
OBSERVAÇÕES FINAIS
Zero dependências externas além do Vue 3
Todo CSS em <style scoped> com variáveis CSS no :root
Sem router (v-if por step em App.vue)
Máscaras de input com @input handlers nativos (sem bibliotecas)
waveHeights: Array.from({ length: 40 }, () => Math.floor(Math.random() * 40 + 8)) no setup()
qrPattern: Array.from({ length: 64 }, () => Math.random() > 0.45) no setup()
Limpar todos os setInterval no onUnmounted
Scroll suave ao trocar step: window.scrollTo({ top: 0, behavior: 'smooth' })
computed genreLabel: genres.find(x => x.value === form.genre)?.label ?? '—'
computed progressPercent: ((currentStep.value - 1) / 6) * 100
Ao resetar: Object.assign(form, { relationship:'', customRelationship:'', honoredName:'', ... }), currentStep.value = 1

