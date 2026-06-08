const VALID_VOICES = new Set(['masculino', 'feminino'])

export function validateQuizStart(req, res, next) {
  const { relationship, honoredName, specialQualities, specialMoments, genre, voice } = req.body
  const errors = []

  if (!relationship) errors.push('relationship é obrigatório')
  if (!honoredName?.trim()) errors.push('honoredName é obrigatório')
  if (relationship === 'outro' && !req.body.customRelationship?.trim()) {
    errors.push('customRelationship é obrigatório quando relationship é outro')
  }
  if (!specialQualities || specialQualities.length < 20) {
    errors.push('specialQualities deve ter no mínimo 20 caracteres')
  }
  if (!specialMoments || specialMoments.length < 20) {
    errors.push('specialMoments deve ter no mínimo 20 caracteres')
  }
  if (!genre) errors.push('genre é obrigatório')
  if (!voice || !VALID_VOICES.has(voice)) errors.push('voice deve ser masculino ou feminino')

  if (errors.length) {
    return res.status(400).json({ error: true, message: errors.join('; '), code: 'VALIDATION_ERROR', errors })
  }

  next()
}

export function validateContactUpdate(req, res, next) {
  const { fullName, email } = req.body
  const errors = []
  if (!fullName?.trim()) errors.push('fullName é obrigatório')
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email inválido')

  if (errors.length) {
    return res.status(400).json({ error: true, message: errors.join('; '), code: 'VALIDATION_ERROR' })
  }

  next()
}
