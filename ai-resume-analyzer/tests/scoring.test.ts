import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyze, validateInput } from '../src/analysis.ts'
import { sample } from '../src/sample.ts'

test('scores and explains the frontend sample consistently', () => {
  const result = analyze({ text: sample, role: 'frontend' })
  assert.equal(result.score, 79)
  assert.deepEqual(result.matched, ['HTML', 'CSS', 'JavaScript', 'React'])
  assert.deepEqual(result.missing, ['Git', 'Accessibility'])
  assert.equal(result.checks.reduce((sum, check) => sum + check.weight, 0), 100)
  assert.ok(result.tips.some((tip) => tip.excerpt))
})

test('uses the general rubric for an unrecognized job description', () => {
  const baseline = analyze({ text: sample })
  const unrecognized = analyze({ text: sample, job: 'Provide excellent service to our visitors.' })
  assert.equal(unrecognized.targeted, false)
  assert.equal(unrecognized.score, baseline.score)
  assert.equal(baseline.checks.length, 4)
})

test('distinguishes Java from JavaScript and recognizes skill aliases', () => {
  const result = analyze({ text: 'Projects\nBuilt a JS dashboard for a campus team.', job: 'Requires Java, JavaScript and PostgreSQL.' })
  assert.deepEqual(result.matched, ['JavaScript'])
  assert.deepEqual(result.missing, ['Java', 'PostgreSQL'])
})

test('rejects invalid request inputs', () => {
  for (const payload of [{ text: '' }, { text: sample, role: 'constructor' }, { text: sample, job: 'x'.repeat(6001) }]) {
    assert.throws(() => validateInput(payload))
  }
})
