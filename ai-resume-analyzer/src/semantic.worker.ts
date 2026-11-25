import { env, pipeline } from '@huggingface/transformers'
import type { Match, SemanticInput, SemanticMessage } from './semantic.ts'

env.allowLocalModels = false
// Single-threaded WASM also works on Pages without cross-origin isolation headers.
env.backends.onnx.wasm!.numThreads = 1

self.onmessage = async ({ data }: MessageEvent<SemanticInput>) => {
  try {
    const { bullets, requirements } = data
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'q8', device: 'wasm', revision: '751bff37182d3f1213fa05d7196b954e230abad9',
    })
    const vectors = (await extractor([...requirements, ...bullets], { pooling: 'mean', normalize: true })).tolist() as number[][]
    const matches: Match[] = []
    requirements.forEach((requirement, index) => {
      const scores = vectors.slice(requirements.length).map((vector) =>
        vector.reduce((score, value, column) => score + value * vectors[index][column], 0))
      const best = Math.max(...scores)
      if (best >= 0.4) matches.push({ requirement, excerpt: bullets[scores.indexOf(best)] })
    })
    self.postMessage({ status: 'done', matches: matches.slice(0, 5) } satisfies SemanticMessage)
  } catch (error) {
    console.warn("AI evidence review unavailable", error instanceof Error ? error.message : "Inference failed")
    self.postMessage({ status: 'error' } satisfies SemanticMessage)
  }
}
