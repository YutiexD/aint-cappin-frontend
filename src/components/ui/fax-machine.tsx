import { useRef, useState, useCallback, useEffect } from 'react'
import type { ChangeEvent } from 'react'

type FaxState = 'idle' | 'ready' | 'pulling' | 'feeding' | 'processing' | 'analyzing'

interface FaxMachineProps {
  onAnalysisStart: () => void
  onFileSelected: (file: File | null) => void
}

export default function FaxMachine({ onAnalysisStart, onFileSelected }: FaxMachineProps) {
  const [state, setState] = useState<FaxState>('idle')
  const [leverAngle, setLeverAngle] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [hoverLever, setHoverLever] = useState(false)
  const leverRef = useRef<HTMLDivElement>(null)
  const isDraggingLever = useRef(false)
  const startY = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      onFileSelected(file)
      setState('ready')
    }
  }

  const handleLeverStart = useCallback((clientY: number) => {
    if (state !== 'ready') return
    isDraggingLever.current = true
    startY.current = clientY
  }, [state])

  const handleLeverMove = useCallback((clientY: number) => {
    if (!isDraggingLever.current) return
    const delta = clientY - startY.current
    const angle = Math.max(0, Math.min(55, delta * 0.6))
    setLeverAngle(angle)
  }, [])

  const handleLeverEnd = useCallback(() => {
    if (!isDraggingLever.current) return
    isDraggingLever.current = false

    if (leverAngle > 40) {
      setLeverAngle(55)
      setState('pulling')

      setTimeout(() => {
        setState('feeding')
        setTimeout(() => {
          setState('processing')
          setTimeout(() => {
            setState('analyzing')
            onAnalysisStart()
          }, 2200)
        }, 2000)
      }, 600)
    } else {
      setLeverAngle(0)
    }
  }, [leverAngle, onAnalysisStart])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleLeverMove(e.clientY)
    const onMouseUp = () => handleLeverEnd()
    const onTouchMove = (e: TouchEvent) => handleLeverMove(e.touches[0].clientY)
    const onTouchEnd = () => handleLeverEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [handleLeverMove, handleLeverEnd])

  const leverSpringStyle = {
    transform: `rotate(${leverAngle}deg)`,
    transition: isDraggingLever.current ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }

  const isActive = state === 'pulling' || state === 'feeding' || state === 'processing'

  return (
    <div className={`fax-machine-wrapper ${state} ${isActive ? 'active' : ''}`}>
      {/* Ambient glow behind machine */}
      <div className="fax-ambient-glow" />

      {/* The fax machine body */}
      <div className={`fax-machine ${state}`}>
        {/* Top panel with indicators */}
        <div className="fax-top-panel">
          <div className="fax-brand">
            <span className="fax-brand-name">AIN'T CAPPIN</span>
            <span className="fax-brand-model">VERIFIER X-900</span>
          </div>
          <div className="fax-indicators">
            <div className={`fax-led led-power ${state !== 'idle' || true ? 'on' : ''}`} />
            <div className={`fax-led led-ready ${state === 'ready' || isActive ? 'on' : ''}`} />
            <div className={`fax-led led-active ${isActive ? 'on blink' : ''}`} />
          </div>
        </div>

        {/* Paper slot */}
        <div className="fax-slot-area">
          <div className={`fax-slot ${state === 'idle' ? 'glow-invite' : ''} ${state === 'ready' ? 'has-paper' : ''}`}>
            <div className="fax-slot-inner" />
            <div className="fax-slot-shadow" />

            {/* Scan light inside slot */}
            {(state === 'feeding' || state === 'processing') && (
              <div className="fax-scan-light" />
            )}
          </div>

          {/* Paper document */}
          <div className={`fax-paper ${state === 'ready' ? 'inserted' : ''} ${state === 'feeding' ? 'feeding-in' : ''} ${state === 'processing' || state === 'analyzing' ? 'consumed' : ''}`}>
            <div className="fax-paper-content">
              <div className="paper-lines">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="paper-line" style={{ width: `${60 + Math.random() * 35}%` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Insert label */}
          {state === 'idle' && (
            <button
              type="button"
              className="fax-insert-label"
              onClick={() => inputRef.current?.click()}
            >
              <svg className="fax-insert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              INSERT DOCUMENT
            </button>
          )}

          {state === 'ready' && (
            <div className="fax-file-name">
              <svg className="fax-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
              </svg>
              {fileName}
            </div>
          )}
        </div>

        {/* Machine body details */}
        <div className="fax-body">
          <div className="fax-body-texture" />
          <div className="fax-vent-lines">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="fax-vent" />
            ))}
          </div>

          {/* Status display */}
          <div className="fax-display">
            <div className="fax-display-screen">
              <span className="fax-display-text">
                {state === 'idle' && '▸ AWAITING INPUT'}
                {state === 'ready' && '▸ PULL LEVER TO SCAN'}
                {state === 'pulling' && '▸ INITIATING...'}
                {state === 'feeding' && '▸ SCANNING DOCUMENT'}
                {state === 'processing' && '▸ PROCESSING DATA...'}
                {state === 'analyzing' && '▸ ANALYSIS MODE'}
              </span>
            </div>
          </div>

          {/* Processing internals visible through window */}
          {(state === 'feeding' || state === 'processing') && (
            <div className="fax-internals">
              <div className="fax-roller roller-1" />
              <div className="fax-roller roller-2" />
              <div className="fax-internal-light" />
            </div>
          )}
        </div>

        {/* The lever */}
        <div className="fax-lever-assembly">
          <div className="fax-lever-pivot" />
          <div
            ref={leverRef}
            className={`fax-lever ${state === 'ready' ? 'interactive' : ''} ${hoverLever ? 'hovered' : ''}`}
            style={leverSpringStyle}
            onMouseDown={(e) => handleLeverStart(e.clientY)}
            onTouchStart={(e) => handleLeverStart(e.touches[0].clientY)}
            onMouseEnter={() => setHoverLever(true)}
            onMouseLeave={() => setHoverLever(false)}
          >
            <div className="fax-lever-shaft" />
            <div className="fax-lever-handle">
              {state === 'ready' && <span className="lever-label">PULL</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Machine vibration overlay */}
      {(state === 'feeding' || state === 'processing') && (
        <div className="fax-vibration-overlay" />
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={handleFileSelect}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />
    </div>
  )
}
