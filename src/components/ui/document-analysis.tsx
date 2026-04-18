import { useState, useEffect, useRef, useCallback } from 'react'

type AnalysisPhase = 'intro' | 'scanning' | 'complete'
type LineColor = 'green' | 'red' | 'grey' | 'purple' | 'yellow'

const LINE_COLORS: LineColor[] = ['green', 'red', 'grey', 'purple', 'yellow']

interface ScanLine {
  id: number
  width: number        // percentage width of the line
  indent: number       // left indent percentage
  color: LineColor | null
  lit: boolean
}

interface DocumentAnalysisProps {
  active: boolean
  onComplete: () => void
}

const statusMessages = [
  'Initializing verification engine…',
  'Analyzing content structure…',
  'Cross-referencing sources…',
  'Checking factual accuracy…',
  'Detecting AI-generated patterns…',
  'Identifying anomalies…',
  'Validating claims against database…',
  'Running sentiment analysis…',
  'Scanning citation integrity…',
  'Compiling analysis report…',
]

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function generateLines(count: number): ScanLine[] {
  const lines: ScanLine[] = []
  for (let i = 0; i < count; i++) {
    // Simulate paragraph structure — some lines are shorter (end of paragraph),
    // occasional blank gaps, varying indents for realism
    const isShort = Math.random() < 0.18
    const isIndented = Math.random() < 0.12
    const isBlank = Math.random() < 0.06

    lines.push({
      id: i,
      width: isBlank ? 0 : isShort ? randomBetween(25, 55) : randomBetween(60, 95),
      indent: isIndented ? randomBetween(4, 12) : 0,
      color: null,
      lit: false,
    })
  }
  return lines
}

export default function DocumentAnalysis({ active, onComplete }: DocumentAnalysisProps) {
  const [phase, setPhase] = useState<AnalysisPhase>('intro')
  const [lines, setLines] = useState<ScanLine[]>([])
  const [statusMessage, setStatusMessage] = useState(statusMessages[0])
  const [progress, setProgress] = useState(0)
  const [scanY, setScanY] = useState(-1) // which line the scan beam is at
  const containerRef = useRef<HTMLDivElement>(null)
  const statusInterval = useRef<number>(0)
  const scanTimer = useRef<number>(0)
  const highlightTimer = useRef<number>(0)

  // Initialize
  useEffect(() => {
    if (!active) return

    const generated = generateLines(42)
    setLines(generated)
    setPhase('intro')
    setProgress(0)
    setScanY(-1)

    const introTimer = setTimeout(() => {
      setPhase('scanning')
    }, 1200)

    return () => clearTimeout(introTimer)
  }, [active])

  // Rotate status messages
  useEffect(() => {
    if (phase !== 'scanning') return
    let idx = 0
    statusInterval.current = window.setInterval(() => {
      idx = (idx + 1) % statusMessages.length
      setStatusMessage(statusMessages[idx])
    }, 2200)
    return () => window.clearInterval(statusInterval.current)
  }, [phase])

  // Scan beam sweeping down the document
  useEffect(() => {
    if (phase !== 'scanning') return

    let currentLine = 0
    const totalLines = 42
    const scanSpeed = 180 // ms per line

    scanTimer.current = window.setInterval(() => {
      currentLine++
      setScanY(currentLine)
      setProgress(Math.min((currentLine / totalLines) * 100, 100))

      if (currentLine >= totalLines + 4) {
        window.clearInterval(scanTimer.current)
        setPhase('complete')
        setTimeout(() => onComplete(), 2000)
      }
    }, scanSpeed)

    return () => window.clearInterval(scanTimer.current)
  }, [phase, onComplete])

  // Random highlight effect — lights up lines in random colors
  const highlightRandomLine = useCallback(() => {
    setLines(prev => {
      const nonBlank = prev.filter(l => l.width > 0)
      if (nonBlank.length === 0) return prev

      const target = nonBlank[Math.floor(Math.random() * nonBlank.length)]
      const color = LINE_COLORS[Math.floor(Math.random() * LINE_COLORS.length)]

      return prev.map(l =>
        l.id === target.id ? { ...l, color, lit: true } : l
      )
    })
  }, [])

  useEffect(() => {
    if (phase !== 'scanning') return

    // Highlight random lines at a fast pace
    highlightTimer.current = window.setInterval(() => {
      highlightRandomLine()
    }, 120)

    return () => window.clearInterval(highlightTimer.current)
  }, [phase, highlightRandomLine])

  // Auto-scroll to scan beam
  useEffect(() => {
    if (scanY < 0 || !containerRef.current) return
    const lineEl = containerRef.current.querySelector(`[data-line="${scanY}"]`)
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [scanY])

  if (!active) return null

  const scanComplete = phase === 'complete'

  return (
    <div className={`analysis-overlay ${phase} ${scanComplete ? 'complete' : ''}`}>
      <div className="analysis-grid-bg" />

      {/* Header */}
      <div className="analysis-header">
        <div className="analysis-header-left">
          <div className="analysis-logo">
            <svg className="analysis-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>AIN'T CAPPIN</span>
          </div>
          <div className="analysis-status-pill">
            <div className={`status-dot ${phase === 'scanning' ? 'pulse' : ''} ${scanComplete ? 'done' : ''}`} />
            <span>{scanComplete ? 'Analysis complete.' : statusMessage}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="analysis-progress-track">
        <div className="analysis-progress-fill" style={{ width: `${progress}%` }} />
        <div className="analysis-progress-glow" style={{ left: `${progress}%` }} />
      </div>

      {/* Document area */}
      <div className="analysis-document-area" ref={containerRef}>
        <div className={`analysis-document ${phase === 'intro' ? 'materializing' : 'visible'}`}>
          {/* Doc header */}
          <div className="doc-header">
            <div className="doc-title-bar">
              <div className="doc-dots"><span /><span /><span /></div>
              <span className="doc-title">document_scan.pdf</span>
              <span className="doc-badge">{scanComplete ? 'ANALYZED' : 'SCANNING'}</span>
            </div>
          </div>

          {/* Abstract scan lines */}
          <div className="doc-lines-container">
            {lines.map((line, index) => (
              <div
                key={line.id}
                data-line={index}
                className={`scan-line-row ${scanY === index ? 'beam-active' : ''} ${line.lit ? 'lit' : ''}`}
              >
                {/* Scan beam */}
                {scanY === index && <div className="scan-beam" />}

                {/* The abstract line block */}
                {line.width > 0 && (
                  <div
                    className={`scan-block ${line.color ? `color-${line.color}` : ''} ${line.lit ? 'flash' : ''}`}
                    style={{
                      width: `${line.width}%`,
                      marginLeft: `${line.indent}%`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completion flash */}
      {scanComplete && <div className="analysis-complete-flash" />}

      {/* Corner decorations */}
      <div className="corner-dec top-left" />
      <div className="corner-dec top-right" />
      <div className="corner-dec bottom-left" />
      <div className="corner-dec bottom-right" />
    </div>
  )
}
