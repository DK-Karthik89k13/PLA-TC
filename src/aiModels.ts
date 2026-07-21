/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared catalog of selectable AI providers/models for the test generator
// and the Placement AI Coach chat. Used by the frontend model picker and
// mirrored on the server to validate incoming requests.

export type AiProvider = 'gemini' | 'huggingface';

export interface AiModelOption {
  id: string; // model id sent to the provider's API
  label: string; // human friendly name shown in the picker
  description: string;
}

export const AI_PROVIDERS: { id: AiProvider; label: string; models: AiModelOption[] }[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    models: [
      {
        id: 'gemini-3.5-flash',
        label: 'Gemini 3.5 Flash',
        description: 'Fast, low-latency model. Default & recommended.'
      }
    ]
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    models: [
      {
        id: 'meta-llama/Llama-3.1-8B-Instruct',
        label: 'Llama 3.1 8B Instruct',
        description: 'Meta\u2019s open instruct model, good general reasoning.'
      },
      {
        id: 'mistralai/Mistral-7B-Instruct-v0.3',
        label: 'Mistral 7B Instruct v0.3',
        description: 'Lightweight, fast open-weight instruct model.'
      },
      {
        id: 'Qwen/Qwen2.5-7B-Instruct',
        label: 'Qwen 2.5 7B Instruct',
        description: 'Strong at structured/JSON output.'
      }
    ]
  }
];

export const DEFAULT_PROVIDER: AiProvider = 'gemini';
export const DEFAULT_MODEL = AI_PROVIDERS[0].models[0].id;

export function getDefaultModelForProvider(provider: AiProvider): string {
  const found = AI_PROVIDERS.find((p) => p.id === provider);
  return found?.models[0]?.id || DEFAULT_MODEL;
}
