const MAX_FILE = 5 * 1024 * 1024

export async function extract(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!['pdf', 'docx', 'txt'].includes(extension ?? '')) throw new Error('Choose a PDF, DOCX, or TXT file.')
  if (file.size > MAX_FILE) throw new Error('Choose a file smaller than 5 MB.')
  if (!file.size) throw new Error('This file is empty. Choose a resume with readable text.')

  let text: string
  try {
    if (extension === 'pdf') {
      const [{ getDocument, GlobalWorkerOptions }, { default: worker }] = await Promise.all([
        import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ])
      GlobalWorkerOptions.workerSrc = worker
      const loading = getDocument({ data: await file.arrayBuffer(), stopAtErrors: true })
      try {
        const pdf = await loading.promise
        if (pdf.numPages > 25) throw new Error('PageLimit')
        const pages = []
        for (let index = 1; index <= pdf.numPages; index++) {
          const page = await pdf.getPage(index)
          const { items } = await page.getTextContent()
          pages.push(items.map((item) => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join(''))
        }
        text = pages.join('\n')
      } finally {
        await loading.destroy()
      }
    } else if (extension === 'docx') {
      const { extractRawText } = await import('mammoth')
      text = (await extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
    } else {
      text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
      if (text.includes('\0')) throw new Error('InvalidText')
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException')
      throw new Error('This PDF is password protected. Export an unlocked copy and try again.')
    if (error instanceof Error && error.message === 'PageLimit')
      throw new Error('Use a PDF with 25 pages or fewer.')
    throw new Error(`We couldn’t read this ${extension?.toUpperCase()} file. Export a fresh copy or try TXT.`)
  }

  text = text.trim()
  if (text.length < 20) throw new Error(extension === 'pdf'
    ? 'No readable text found. If this PDF is a scan, upload a text-based PDF, DOCX, or TXT instead.'
    : 'This file contains too little readable text. Choose a complete resume.')
  return text
}
