export const MAX_TEXT = 50_000
export const MAX_JOB = 6_000

const skills = [
  'JavaScript', 'TypeScript', 'HTML', 'CSS', 'React', 'Node.js', 'Git', 'Python',
  'Java', 'C++', 'C#', 'SQL', 'Excel', 'Power BI', 'Tableau', 'Pandas', 'NumPy',
  'Data visualization', 'Statistics', 'Figma', 'Prototyping', 'Wireframing',
  'User research', 'Accessibility', 'REST API', 'Docker', 'Linux', 'AWS', 'MongoDB',
  'PostgreSQL', 'Machine learning', 'NLP', 'TensorFlow', 'PyTorch', 'Communication',
  'Project management', 'Testing', 'Agile', 'Scrum', 'GitHub Actions', 'CI/CD',
  'Google Analytics', 'SEO', 'Canva', 'Digital marketing', 'Accounting', 'Tally',
  'Financial reporting', 'Bookkeeping', 'GST', 'PowerPoint', 'Data analysis',
  'Next.js', 'Express', 'Vue', 'Django', 'Flask', 'FastAPI', 'Kubernetes',
  'MySQL', 'Azure', 'Google Cloud', 'Data structures', 'Algorithms', 'Spring Boot',
] as const
type Skill = typeof skills[number]

const aliases: Partial<Record<Skill, string[]>> = {
  'JavaScript': ['JS'], 'TypeScript': ['TS'], 'React': ['React.js', 'ReactJS'],
  'Node.js': ['NodeJS'], 'REST API': ['REST APIs', 'RESTful APIs'],
  'Excel': ['Microsoft Excel', 'MS Excel'], 'Power BI': ['PowerBI'],
  'NLP': ['natural language processing'], 'Testing': ['unit testing', 'automated testing', 'software testing'],
}

export const roles = {
  frontend: { label: 'Frontend Developer', skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Git', 'Accessibility'] },
  data: { label: 'Data Analyst', skills: ['Excel', 'SQL', 'Python', 'Statistics', 'Power BI', 'Data visualization'] },
  design: { label: 'UX Designer', skills: ['Figma', 'Prototyping', 'Wireframing', 'User research', 'Accessibility'] },
  accounting: { label: 'Accounting Assistant', skills: ['Excel', 'Accounting', 'Bookkeeping', 'Tally', 'GST', 'Financial reporting'] },
} satisfies Record<string, { label: string; skills: Skill[] }>

export type Role = keyof typeof roles
export type Input = { text: string; role?: Role; job?: string }

const sectionPatterns = {
  education: /^(education|academic background|qualifications)\b/i,
  experience: /^(experience|work experience|professional experience|internships?)\b/i,
  projects: /^(projects|academic projects|personal projects|selected projects)\b/i,
  skills: /^(skills|technical skills|core competencies|technologies)\b/i,
  summary: /^(summary|profile|professional summary|career objective|objective)\b/i,
}
const action = /^(?:[-*•●▪–]\s*|\d+[.)]\s*)?(?:analy[sz]ed|built|created|delivered|designed|developed|implemented|improved|increased|launched|led|managed|optimized|organized|reduced|streamlined|tested|trained|wrote|automated|maintained|prepared|reconciled|researched|collaborated|migrated|integrated|achieved)\b/i
const quantified = /(?:\b\d[\d,.]*\s*(?:%|users?\b|records?\b|hours?\b|minutes?\b|days?\b|pages?\b|samples?\b|tests?\b|requests?\b|clients?\b|projects?\b|students?\b|files?\b|items?\b|transactions?\b|ms\b|seconds?\b|x\b)|[₹$]\s*\d)/i

function mentioned(text: string, skill: Skill) {
  return [skill, ...(aliases[skill] ?? [])].some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?:^|[^a-z0-9#+])${escaped}(?![a-z0-9#+])`, 'i').test(text)
  })
}

export class InputError extends Error {}
export function validateInput(data: unknown): Input {
  if (!data || typeof data !== 'object') throw new InputError('Provide resume text to analyze.')
  const { text, role, job } = data as Partial<Input>
  if (typeof text !== 'string' || text.trim().length < 20 || text.length > MAX_TEXT)
    throw new InputError('Use a resume with between 20 and 50,000 characters of readable text.')
  if (role !== undefined && (typeof role !== 'string' || !Object.hasOwn(roles, role)))
    throw new InputError('Choose a supported target role.')
  if (job !== undefined && (typeof job !== 'string' || job.length > MAX_JOB))
    throw new InputError('Limit the job description to 6,000 characters.')
  return { text, role, job: job?.trim() }
}

type Tip = { title: string; detail: string; excerpt?: string }
export function analyze(input: Input) {
  const { text, role, job } = validateInput(input)
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const words = text.trim().split(/\s+/).length
  const hasSection = Object.fromEntries(Object.entries(sectionPatterns).map(([key, pattern]) => [
    key, lines.some((line) => line.split(/[:|]/)[0].split(/\s+/).length <= 4 && pattern.test(line)),
  ]))
  const email = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text)
  const contact = lines.slice(0, 8).join(' | ')
  const phone = [...contact.matchAll(/(?:^|[^\w])((?:\+\d{1,3}[ .-]?)?(?:\(\d{2,4}\)[ .-]?)?\d(?:[ .-]?\d){9,13})(?!\d)/g)]
    .some((match) => match[1].replace(/\D/g, '').length <= 15)
  const evidence = lines.filter((line) => action.test(line) || /^[-*•●▪–]\s*\S/.test(line))
  const actionLines = evidence.filter((line) => action.test(line))
  const impactLines = evidence.filter((line) => quantified.test(line))
  const longLine = lines.find((line) => line.split(/\s+/).length > 36)
  const detected = skills.filter((skill) => mentioned(text, skill))
  const target = job ? skills.filter((skill) => mentioned(job, skill)) : (role ? roles[role].skills : [])
  const matched = target.filter((skill) => detected.includes(skill))
  const missing = target.filter((skill) => !detected.includes(skill))
  const targeted = target.length > 0

  const points = (label: string, weight: number, ratio: number, detail: string) =>
    ({ label, weight, points: Math.round(weight * ratio), detail })
  const checks = [
    points('Structure', targeted ? 25 : 30,
      (Number(hasSection.education) + Number(hasSection.skills) + Number(hasSection.experience || hasSection.projects) + Number(hasSection.summary)) / 4,
      'Recognizable headings for education, skills, experience or projects, and a summary.'),
    points('Contact details', targeted ? 10 : 15, Number(email) * 0.6 + Number(phone) * 0.4,
      'Email and a phone number near the top of the resume.'),
    points('Evidence of impact', targeted ? 25 : 35, 0.5 * Math.min(actionLines.length / 3, 1) + 0.5 * Math.min(impactLines.length / 2, 1),
      'Up to three action-led bullets and two bullets with measurable outcomes.'),
    points('Readability', targeted ? 15 : 20, Number(words >= 100 && words <= 750) * 0.5 + Number(!longLine) * 0.3 + Number(lines.length >= 7) * 0.2,
      'Text-based checks for length, concise lines, and line breaks.'),
  ]
  if (targeted) checks.push(points('Skill coverage', 25, matched.length / target.length, 'Share of recognized target skills present in your resume.'))

  const tips: Tip[] = []
  if (missing.length) tips.push({ title: 'Back up relevant skills', detail: `The target mentions ${missing.slice(0, 6).join(', ')}. If you have used a skill, describe where and how. Prioritize genuine gaps for practice.` })
  if (impactLines.length < 2 || actionLines.length < 3) tips.push({
    title: impactLines.length < 2 ? 'Show the outcome of your work' : 'Lead with a specific action',
    detail: 'Start a project or experience bullet with a verb and add a measured result or scope you can verify.',
    excerpt: evidence.find((line) => !quantified.test(line))?.slice(0, 230),
  })
  if (!hasSection.education || !hasSection.skills || !(hasSection.experience || hasSection.projects) || !hasSection.summary) {
    const absent = [
      !hasSection.education && 'Education', !hasSection.skills && 'Skills',
      !(hasSection.experience || hasSection.projects) && 'Experience or Projects', !hasSection.summary && 'Summary',
    ].filter(Boolean)
    tips.push({ title: 'Make sections easy to find', detail: `Use clear headings for ${absent.join(', ')} where relevant.` })
  }
  if (!email || !phone) tips.push({ title: 'Make it easy to contact you', detail: 'Put a current email address and phone number near the top.' })
  if (words < 100 || words > 750 || longLine || lines.length < 7) tips.push({
    title: 'Make the text easier to skim',
    detail: 'Use concise lines and distinct bullets. Keep enough context for a reader to understand each project.',
    excerpt: longLine?.slice(0, 230),
  })

  // Skip contact lines and bound the text sent to the local inference worker.
  const bullets = evidence.filter((line) => !line.includes('@')).slice(0, 24).map((line) => line.slice(0, 400))
  const requirements = job
    ? job.split(/\r?\n|(?<=[.!?])\s+/).map((line) => line.trim()).filter((line) => line.length >= 12).slice(0, 8).map((line) => line.slice(0, 350))
    : role ? roles[role].skills.map((skill) => `Practical experience with ${skill}`) : []
  return {
    score: checks.reduce((sum, check) => sum + check.points, 0),
    checks, detected, matched, missing, tips, bullets, requirements, words, targeted,
    targetLabel: job ? 'Custom job description' : role ? roles[role].label : 'General review',
  }
}

export type Analysis = ReturnType<typeof analyze>
