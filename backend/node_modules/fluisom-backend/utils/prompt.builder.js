const RELATIONSHIP_LABELS = {
  esposo: 'Esposo(a)',
  namorado: 'Namorado(a)',
  reconciliacao: 'Reconciliação',
  noivo: 'Noivo(a)',
  crush: 'Crush/Paixão',
  amigo: 'Amigo(a)',
  mae: 'Mãe',
  pai: 'Pai',
  filho: 'Filho(a)',
  irmao: 'Irmão(ã)',
  eu: 'Eu mesmo',
  outro: 'Outro',
}

const GENRE_STYLES = {
  romantico: 'Romantic Brazilian ballad, emotional, warm, heartfelt vocals',
  gospel: 'Gospel worship, uplifting, spiritual, Brazilian gospel',
  sertanejo: 'Sertanejo romântico, viola, acoustic guitar, Brazilian country',
  samba: 'Samba pagode, percussion, joyful Brazilian rhythm',
  forro: 'Forró pé de serra, accordion, northeastern Brazil',
  pop: 'Contemporary pop, catchy melody, polished production',
  mpb: 'MPB Brazilian popular music, poetic, melodic',
  infantil: 'Children song, playful, gentle, family friendly',
  rock: 'Rock ballad, electric guitars, emotional intensity',
  reggae: 'Reggae, laid back groove, positive vibes',
  eletronico: 'Electronic pop, modern synths, danceable',
  jazz: 'Smooth jazz, sophisticated, mellow',
  hiphop: 'Hip-hop R&B, rhythmic flow, urban Brazilian',
  funk: 'Brazilian funk carioca, energetic beats',
}

const GENRE_LABELS = {
  romantico: 'Romântico',
  gospel: 'Gospel',
  sertanejo: 'Sertanejo',
  samba: 'Samba/Pagode',
  forro: 'Forró',
  pop: 'Pop',
  mpb: 'MPB',
  infantil: 'Infantil',
  rock: 'Rock',
  reggae: 'Reggae',
  eletronico: 'Eletrônico',
  jazz: 'Jazz',
  hiphop: 'Hip-Hop/Rap',
  funk: 'Funk',
}

export function getRelationshipLabel(order) {
  if (order.relationship === 'outro') return order.custom_relationship || 'Outro'
  return RELATIONSHIP_LABELS[order.relationship] || order.relationship
}

export function getGenreStyle(genre) {
  return GENRE_STYLES[genre] || GENRE_LABELS[genre] || genre
}

export function getGenreLabel(genre) {
  return GENRE_LABELS[genre] || genre
}

export function buildLyricsPrompt(order) {
  const relationship = getRelationshipLabel(order)
  const genreLabel = getGenreLabel(order.genre)
  const voiceLabel = order.voice === 'feminino' ? 'voz feminina' : 'voz masculina'

  return `Você é um compositor brasileiro especializado em músicas personalizadas emocionantes.

Crie a LETRA COMPLETA de uma música em português do Brasil para homenagear uma pessoa especial.

CONTEXTO DO QUIZ:
- Relacionamento: ${relationship}
- Nome da pessoa homenageada: ${order.honored_name}
- Qualidades especiais: ${order.special_qualities}
- Momentos marcantes: ${order.special_moments}
${order.special_message ? `- Mensagem especial desejada: ${order.special_message}` : ''}
- Gênero musical desejado: ${genreLabel}
- Preferência vocal: ${voiceLabel}

REGRAS OBRIGATÓRIAS:
1. Escreva APENAS a letra, sem explicações, títulos extras ou comentários.
2. Use estrutura clara com marcadores [Verso 1], [Pré-Refrão], [Refrão], [Verso 2], [Ponte], [Refrão Final].
3. Mencione o nome "${order.honored_name}" de forma natural e emocionante.
4. Tom profundamente pessoal, autêntico e comovente — adequado para ${relationship}.
5. Estilo lírico compatível com ${genreLabel}.
6. Letra com 2-3 versos, refrão marcante e ponte emocional.
7. Evite clichês vazios; use detalhes concretos das qualidades e momentos fornecidos.
8. Não inclua emojis nem formatação markdown.

Retorne somente a letra final pronta para ser cantada.`
}

export function buildMusicTitle(order) {
  return `Música para ${order.honored_name}`.slice(0, 80)
}

export function getLyricsPreview(lyrics, lines = 4) {
  if (!lyrics) return ''
  return lyrics
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('['))
    .slice(0, lines)
    .join('\n')
}
