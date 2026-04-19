import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { LeverSwitch } from './lever-switch'

type FaxState = 'idle' | 'ready' | 'pulling' | 'feeding' | 'processing' | 'analyzing'

interface FaxMachineProps {
  onAnalysisStart: () => void
  onFileSelected: (file: File | null) => void
}

export default function FaxMachine({ onAnalysisStart, onFileSelected }: FaxMachineProps) {
  const [state, setState] = useState<FaxState>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      onFileSelected(file)
      setState('ready')
    }
  }

  const handleLeverToggle = (checked: boolean) => {
    if (!checked || state !== 'ready') return

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
          <div className={`fax-paper ${state === 'ready' || state === 'pulling' ? 'inserted' : ''} ${state === 'feeding' ? 'feeding-in' : ''} ${state === 'processing' || state === 'analyzing' ? 'consumed' : ''}`}>
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
                {state === 'ready' && '▸ FLIP LEVER TO SCAN'}
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

        {/* The lever switch */}
        <div className="fax-lever-assembly">
          <LeverSwitch
            disabled={state !== 'ready'}
            onToggle={handleLeverToggle}
          />
          <span className="lever-switch-label">
            {state === 'ready' ? 'SCAN' : state === 'idle' ? 'LOCKED' : 'ACTIVE'}
          </span>
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
