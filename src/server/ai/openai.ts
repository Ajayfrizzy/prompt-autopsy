import 'server-only';
import OpenAI from 'openai';
import { SafeError, type Provider } from './provider';

export function openAIProvider(): Provider {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new SafeError('PROVIDER_UNAVAILABLE', 'The server AI provider is not configured. Set the server-only API key before retrying.', false, undefined, 503);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
  return {
    count: (context, signal) => client.responses.inputTokens.count(context, { signal }),
    generate: (context, signal) => client.responses.create(context, { signal }),
  };
}
