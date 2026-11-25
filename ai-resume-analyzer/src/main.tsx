import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, ArrowDown, ArrowUpRight, Check, CircleAlert, ClipboardList, FileText, Focus, Gauge, Layers3, LockKeyhole, ScanLine, Sparkles, Target, UploadCloud, X } from 'lucide-react'
import { analyze, MAX_JOB, roles, validateInput } from './analysis.ts'
import type { Analysis, Input, Role } from './analysis.ts'
import { extract } from './extract.ts'
import { sample } from './sample.ts'
import type { Match, SemanticMessage } from './semantic.ts'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import './style.css'

const local = location.hostname === '127.0.0.1' && location.port === '4174'
const scorePreview = analyze({ text: sample, role: 'frontend' })

function Dial({ value }: { value: number }) {
  return <div className="dial" aria-label={`${value} out of 100`}>
    <svg width="139" height="139" viewBox="0 0 140 140" aria-hidden="true">
      <defs><linearGradient id="scoreGradient" x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox">
        <stop stopColor="#a783ff" /><stop offset="1" stopColor="#ff965b" />
      </linearGradient></defs>
      <circle cx="70" cy="70" r="61" className="dial-track" />
      {value > 0 && <circle cx="70" cy="70" r="61" className="dial-value" pathLength="100" strokeDasharray={`${value} 100`} transform="rotate(-90 70 70)" />}
    </svg>
    <div className="dial-number"><strong>{value}</strong><span>/ 100</span></div>
  </div>
}

function Meter({ label, points, weight }: { label: string; points: number; weight: number }) {
  return <div className="meter">
    <div><span>{label}</span><span>{points}<span className="quiet"> / {weight}</span></span></div>
    <div className="meter-track"><span style={{ width: `${points / weight * 100}%` }} /></div>
  </div>
}

function PanelHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="panel-heading"><div className="panel-icon">{icon}</div><div><h2>{title}</h2><p>{description}</p></div></div>
}

function Preview() {
  return <aside className="panel preview" aria-label="Sample ATS result">
    <div className="preview-top"><span><Activity size={16} /> Analysis preview</span><span className="sample-label">Sample result</span></div>
    <div className="preview-score"><Dial value={scorePreview.score} /><div><h2>Estimated ATS score</h2><p>See what’s working and where to focus your next edit.</p></div></div>
    <div className="preview-meters">{scorePreview.checks.map((check) => <Meter key={check.label} {...check} />)}</div>
    <div className="preview-tip"><Sparkles size={17} /><span><strong>One improvement to try</strong><br />Show the outcome of your work with a measurable result.</span></div>
  </aside>
}

type SemanticState = 'idle' | 'loading' | 'done' | 'error'

function Results({ data, filename, status, matches, heading }: {
  data: Analysis; filename: string; status: SemanticState; matches: Match[]; heading: React.RefObject<HTMLHeadingElement | null>
}) {
  return <aside className="panel results" aria-labelledby="results-heading">
    <div className="preview-top"><span><Activity size={16} /> Analysis complete</span></div>
    <div className="preview-score"><Dial value={data.score} /><div>
      <h2 id="results-heading" ref={heading} tabIndex={-1}>Estimated ATS score</h2>
      <p>{data.targetLabel} · {data.words} words</p><p className="filename">{filename}</p>
    </div></div>
    <div className="preview-meters">{data.checks.map((check) => <Meter key={check.label} {...check} />)}</div>
    <details className="rubric"><summary>How the score is calculated</summary><ul>{data.checks.map((check) =>
      <li key={check.label}><strong>{check.label} ({check.weight} points)</strong> {check.detail}</li>)}</ul>
      <p>This is a rubric-based estimate. Employers can use different screening rules.</p>
    </details>
    {data.targetLabel === 'Custom job description' && !data.targeted &&
      <p className="notice">No target skills from the current dictionary were recognized. The general scoring rubric was used.</p>}
    <div className="result-section"><h3>Skills found</h3>
      <div className="chips">{data.detected.map((skill) => <span key={skill}>{skill}</span>)}
        {!data.detected.length && <p>No skills from the current dictionary were detected.</p>}</div>
    </div>
    {data.targeted && <div className="result-section"><h3>Target skill coverage <small>{data.matched.length} of {data.matched.length + data.missing.length}</small></h3>
      <div className="chips">
        {data.matched.map((skill) => <span className="covered" key={skill}><Check size={13} />{skill}</span>)}
        {data.missing.map((skill) => <span className="missing" key={skill}><CircleAlert size={13} />{skill}</span>)}
      </div><p className="notice">Orange skills weren’t found by keyword. Add evidence only for skills you actually have.</p>
    </div>}
    <div className="result-section"><h3>Recommended improvements</h3>
      {data.tips.length ? <ol className="tips">{data.tips.map((tip) => <li key={tip.title}><strong>{tip.title}</strong><p>{tip.detail}</p>
        {tip.excerpt && <blockquote>{tip.excerpt}</blockquote>}</li>)}</ol> : <p>Your resume passes the current checks. Read each bullet once for clarity and accuracy.</p>}
    </div>
    {status !== 'idle' && <div className="result-section"><h3><Sparkles size={17} /> AI evidence review</h3>
      <div role="status">
        {status === 'loading' && <p>Loading the AI model and looking for related resume excerpts. The score and recommendations are ready.</p>}
        {status === 'error' && <p>The AI evidence review is unavailable. Your score and recommendations are ready.</p>}
        {status === 'done' && (matches.length ? <ul className="tips comparisons">{matches.map((match) =>
          <li key={match.requirement}><strong>{match.requirement}</strong><blockquote>{match.excerpt}</blockquote></li>)}</ul>
          : <p>No close matches were found in the detected resume bullets.</p>)}
      </div>
      {status === 'done' && matches.length > 0 && <p className="notice">These excerpts may relate to the target. Review the connection before relying on it.</p>}
    </div>}
  </aside>
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [role, setRole] = useState<Role | 'general' | 'custom'>('general')
  const [job, setJob] = useState('')
  const [result, setResult] = useState<{ data: Analysis; filename: string }>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [status, setStatus] = useState<SemanticState>('idle')
  const [matches, setMatches] = useState<Match[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const dragDepth = useRef(0)
  const submitting = useRef(false)

  useEffect(() => {
    if (!result) return
    heading.current?.focus({ preventScroll: true })
    if (matchMedia('(max-width: 800px)').matches) heading.current?.closest('aside')?.scrollIntoView({ block: 'start' })
    const { requirements, bullets } = result.data
    if (!requirements.length || !bullets.length) return

    let worker: Worker | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    const finish = (message: SemanticMessage) => {
      worker?.terminate()
      clearTimeout(timeout)
      if (message.status === 'done') setMatches(message.matches)
      setStatus(message.status)
    }
    try {
      worker = new Worker(new URL('./semantic.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<SemanticMessage>) => finish(event.data)
      worker.onerror = () => finish({ status: 'error' })
      timeout = setTimeout(() => finish({ status: 'error' }), 60_000)
      worker.postMessage({ bullets, requirements })
    } catch {
      finish({ status: 'error' })
    }
    return () => {
      clearTimeout(timeout)
      worker?.terminate()
    }
  }, [result])

  function clearResult() {
    setError('')
    setResult(undefined)
    setMatches([])
    setStatus('idle')
  }

  function choose(files: FileList | null) {
    if (!files?.length || submitting.current) return
    clearResult()
    if (files.length !== 1) {
      setFile(null)
      setError('Choose one resume at a time.')
      return
    }
    const selected = files[0]
    if (!/\.(pdf|docx|txt)$/i.test(selected.name) || selected.size > 5 * 1024 * 1024 || !selected.size) {
      setFile(null)
      setError(!selected.size ? 'This file is empty.' : 'Choose a PDF, DOCX, or TXT file up to 5 MB.')
      return
    }
    setFile(selected)
  }

  async function run(useSample = false) {
    if (submitting.current) return
    if (!useSample && !file) {
      setError('Choose a resume before analyzing.')
      fileInput.current?.focus()
      return
    }
    if (!useSample && role === 'custom' && !job.trim()) {
      setError('Paste the job description or choose General review.')
      document.getElementById('job')?.focus()
      return
    }
    submitting.current = true
    clearResult()
    setBusy(true)
    try {
      if (useSample) {
        setFile(null)
        setRole('frontend')
        setJob('')
      }
      const input: Input = validateInput({
        text: useSample ? sample : await extract(file!),
        role: useSample ? 'frontend' : (role === 'general' || role === 'custom' ? undefined : role),
        job: !useSample && role === 'custom' ? job : undefined,
      })
      let data: Analysis
      if (local) {
        const response = await fetch('/api/analyze', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
        })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'The local API could not complete the analysis.')
        data = body
      } else {
        data = analyze(input)
      }
      if (data.requirements.length && data.bullets.length) setStatus('loading')
      setResult({ data, filename: useSample ? 'Sample resume' : file!.name })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Try another resume.')
    } finally {
      setBusy(false)
      submitting.current = false
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void run()
  }

  return <>
    <header className="site-header"><div className="container header-inner">
      <a className="brand" href="./" aria-label="Resume Lens home"><span className="brand-icon"><ScanLine size={22} /></span>Resume<span>Lens</span></a>
      <a href="#how-it-works" className="how-link">How it works <ArrowDown size={14} /></a>
    </div></header>
    <main className="container">
      <section className="hero" aria-labelledby="title">
        <div className="hero-ambient" aria-hidden="true" />
        <div className="eyebrow"><Sparkles size={15} /> AI RESUME ANALYZER</div>
        <h1 id="title">See your resume<br className="desktop-break" /> <em>through an ATS lens.</em></h1>
        <p>Get an estimated ATS score, find gaps in your resume, and see what to improve before you apply.</p>
      </section>
      <div className="workspace">
        <section className="panel upload-panel" aria-label="Resume upload">
          <PanelHeading icon={<FileText size={22} />} title="Analyze your resume" description="Upload a file to get feedback in seconds." />
          <form onSubmit={submit}>
            <div className={`drop-zone ${drag ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); if (!busy && event.dataTransfer.types.includes('Files')) { dragDepth.current++; setDrag(true) } }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? 'none' : 'copy' }}
              onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDrag(false) }}
              onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDrag(false); choose(event.dataTransfer.files) }}>
              <input id="resume-file" type="file" accept=".pdf,.docx,.txt" ref={fileInput} disabled={busy}
                onChange={(event) => { choose(event.currentTarget.files); event.currentTarget.value = '' }} />
              <label htmlFor="resume-file">
                <span className="upload-icon">{file ? <FileText size={25} /> : <UploadCloud size={27} />}</span>
                <strong>{file ? file.name : 'Drag and drop your resume'}</strong>
                <span>{file ? 'Click to replace this file' : <>or <b>browse files</b></>}</span>
                <small>{file ? `${(file.size / 1024).toFixed(1)} KB` : 'PDF, DOCX, TXT · Up to 5 MB'}</small>
              </label>
              {file && <button type="button" className="remove" aria-label="Remove resume" title="Remove resume" disabled={busy}
                onClick={() => { setFile(null); clearResult(); fileInput.current?.focus() }}><X size={17} /></button>}
            </div>
            <div className="target">
              <label htmlFor="target"><Target size={16} /> Target role <span>Optional</span></label>
              <select id="target" value={role} disabled={busy} onChange={(event) => {
                setRole(event.target.value as typeof role)
                clearResult()
              }}>
                <option value="general">General review</option>
                {Object.entries(roles).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
                <option value="custom">Paste a job description</option>
              </select>
              {role === 'custom' && <div className="job-field"><label htmlFor="job">Job description</label>
                <textarea id="job" maxLength={MAX_JOB} disabled={busy} value={job} rows={5} placeholder="Paste the responsibilities and required skills…"
                  onChange={(event) => { setJob(event.target.value); clearResult() }} />
                <span className="count">{job.length.toLocaleString()} / {MAX_JOB.toLocaleString()}</span>
              </div>}
            </div>
            {error && <p className="error" role="alert"><CircleAlert size={17} />{error}</p>}
            <div className="form-actions">
              <button className="primary" type="submit" disabled={busy}><Sparkles size={17} />{busy ? 'Analyzing…' : 'Analyze resume'}</button>
              <button className="secondary" type="button" disabled={busy} onClick={() => void run(true)}>Try a sample <ArrowUpRight size={16} /></button>
            </div>
          </form>
          <p className="privacy"><LockKeyhole size={15} /> {local ? 'Local API mode · Analysis stays on this device.' : 'Your resume stays in this browser.'}</p>
        </section>
        {result ? <Results data={result.data} filename={result.filename} status={status} matches={matches} heading={heading} /> : <Preview />}
      </div>
      <section id="how-it-works" className="how">
        <h2>How it works</h2>
        <div className="how-grid">
          <article><Focus size={21} /><div><h3>Read the resume</h3><p>Extract readable text from your file.</p></div></article>
          <article><Gauge size={21} /><div><h3>Check ATS readiness</h3><p>Review structure, impact, and relevant skills.</p></div></article>
          <article><ClipboardList size={21} /><div><h3>Make your next edit</h3><p>Start with the suggestions that matter most.</p></div></article>
        </div>
      </section>
    </main>
    <footer><div className="container footer-inner"><span><Layers3 size={15} /> Resume Lens</span><span>JECRC University · Student project demo</span></div></footer>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
