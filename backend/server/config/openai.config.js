import OpenAI from 'openai'
import { env } from './env.js'

let client = null

export function getOpenAI() {
  if (!client) {
    if (!env.openaiApiKey) {
      throw new Error('OpenAI não configurado. Defina OPENAI_API_KEY.')
    }
    client = new OpenAI({
      apiKey: env.openaiApiKey,
      timeout: 30000,
    })
  }
  return client
}

export default getOpenAI
