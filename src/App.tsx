import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './App.css'
import './fax-machine.css'
import './document-analysis.css'
import './lever-switch.css'
import FaxMachine from '@/components/ui/fax-machine'
import DocumentAnalysis from '@/components/ui/document-analysis'
import { SmokeBackground } from '@/components/ui/spooky-smoke-animation'
import humanImage from '../up.png'
import aiImage from '../under.png'

type HeroStyle = CSSProperties & Record<`--${string}`, string>
type AlphaMask = {
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
  alpha: Uint8Array
}
type Point = {
  x: number
  y: number
}

type AppPhase = 'hero' | 'fax' | 'analyzing' | 'results'

const proximityThreshold = 42

function loadAlphaMask(src: string, maxSize = 320): Promise<AlphaMask> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight))
      const width = Math.max(1, Math.round(image.naturalWidth * scale))
      const height = Math.max(1, Math.round(image.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })

      if (!context) {
        reject(new Error('Could not create canvas context for alpha mask.'))
        return
      }

      canvas.width = width
      canvas.height = height
      context.drawImage(image, 0, 0, width, height)

      const pixels = context.getImageData(0, 0, width, height).data
      const alpha = new Uint8Array(width * height)

      for (let index = 0; index < alpha.length; index += 1) {
        alpha[index] = pixels[index * 4 + 3] > 20 ? 1 : 0
      }

      resolve({
        width,
        height,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        alpha,
      })
    }
    image.onerror = () => reject(new Error('Could not load portrait alpha mask.'))
    image.src = src
  })
}

function getCoverImageMetrics(rect: DOMRect, mask: AlphaMask) {
  const imageAspect = mask.naturalWidth / mask.naturalHeight
  const rectAspect = rect.width / rect.height
  const renderedWidth = rectAspect > imageAspect ? rect.width : rect.height * imageAspect
  const renderedHeight = rectAspect > imageAspect ? rect.width / imageAspect : rect.height

  return {
    offsetX: (rect.width - renderedWidth) / 2,
    offsetY: (rect.height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
    screenScale: renderedWidth / mask.naturalWidth,
  }
}

function getImagePointFromViewport(point: Point, rect: DOMRect, mask: AlphaMask) {
  const metrics = getCoverImageMetrics(rect, mask)
  const imageX = ((point.x - rect.left - metrics.offsetX) / metrics.renderedWidth) * mask.naturalWidth
  const imageY = ((point.y - rect.top - metrics.offsetY) / metrics.renderedHeight) * mask.naturalHeight

  return { x: imageX, y: imageY }
}

function getDistanceToSubject(point: Point, rect: DOMRect, mask: AlphaMask) {
  const imagePoint = getImagePointFromViewport(point, rect, mask)
  const metrics = getCoverImageMetrics(rect, mask)
  const maskX = (imagePoint.x / mask.naturalWidth) * mask.width
  const maskY = (imagePoint.y / mask.naturalHeight) * mask.height

  if (maskX < 0 || maskY < 0 || maskX >= mask.width || maskY >= mask.height) {
    return Number.POSITIVE_INFINITY
  }

  const currentMaskX = Math.max(0, Math.min(mask.width - 1, Math.round(maskX)))
  const currentMaskY = Math.max(0, Math.min(mask.height - 1, Math.round(maskY)))

  if (mask.alpha[currentMaskY * mask.width + currentMaskX]) {
    return 0
  }

  const pxToMaskX = mask.width / mask.naturalWidth
  const pxToMaskY = mask.height / mask.naturalHeight
  const imagePixelThreshold = proximityThreshold / metrics.screenScale
  const searchRadiusX = Math.ceil(imagePixelThreshold * pxToMaskX) + 2
  const searchRadiusY = Math.ceil(imagePixelThreshold * pxToMaskY) + 2
  const minX = Math.max(0, Math.floor(maskX - searchRadiusX))
  const maxX = Math.min(mask.width - 1, Math.ceil(maskX + searchRadiusX))
  const minY = Math.max(0, Math.floor(maskY - searchRadiusY))
  const maxY = Math.min(mask.height - 1, Math.ceil(maskY + searchRadiusY))
  let minDistance = Number.POSITIVE_INFINITY

  for (let row = minY; row <= maxY; row += 1) {
    for (let col = minX; col <= maxX; col += 1) {
      if (!mask.alpha[row * mask.width + col]) continue

      const imageX = (col / mask.width) * mask.naturalWidth
      const imageY = (row / mask.height) * mask.naturalHeight
      const imageDistance = Math.hypot(imageX - imagePoint.x, imageY - imagePoint.y)
      const screenDistance = imageDistance * metrics.screenScale

      if (screenDistance < minDistance) {
        minDistance = screenDistance
      }
    }
  }

  return minDistance
}

function getProximityBlend(point: Point, rect: DOMRect, mask: AlphaMask) {
  const distance = getDistanceToSubject(point, rect, mask)
  const rawBlend = Math.max(0, Math.min(1, 1 - distance / proximityThreshold))

  return rawBlend * rawBlend * (3 - 2 * rawBlend)
}

function App() {
  const heroRef = useRef<HTMLElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<AlphaMask | null>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const lastPointerRef = useRef({ x: 0, y: 0, time: 0 })
  const isRevealingRef = useRef(false)
  const [isRevealing, setIsRevealing] = useState(false)
  const [appPhase, setAppPhase] = useState<AppPhase>('hero')
  const [, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    let cancelled = false

    loadAlphaMask(humanImage)
      .then((mask) => {
        if (!cancelled) {
          maskRef.current = mask
        }
      })
      .catch((error) => {
        console.error(error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    const setPointer = (x: number, y: number) => {
      const now = performance.now()
      const last = lastPointerRef.current
      const elapsed = Math.max(now - last.time, 16)
      const deltaX = x - last.x
      const deltaY = y - last.y
      const distance = Math.hypot(deltaX, deltaY)
      const speed = Math.min(distance / elapsed, 2.4)
      const directionX = distance > 0 ? deltaX / distance : 0
      const directionY = distance > 0 ? deltaY / distance : 0
      const stretch = speed * 64

      targetRef.current = { x, y }
      lastPointerRef.current = { x, y, time: now }
      hero.style.setProperty('--cursor-x', `${x}px`)
      hero.style.setProperty('--cursor-y', `${y}px`)
      hero.style.setProperty('--target-x', `${(x / window.innerWidth - 0.5) * -18}px`)
      hero.style.setProperty('--target-y', `${(y / window.innerHeight - 0.5) * -18}px`)
      hero.style.setProperty('--cursor-speed', `${speed}`)
      hero.style.setProperty('--reveal-w', `${270 + stretch}px`)
      hero.style.setProperty('--reveal-h', `${250 - Math.min(stretch * 0.16, 24)}px`)
      hero.style.setProperty('--tail-x', `${-directionX * Math.min(stretch * 0.54, 58)}px`)
      hero.style.setProperty('--tail-y', `${-directionY * Math.min(stretch * 0.54, 58)}px`)
      hero.style.setProperty('--side-x', `${-directionY * Math.min(stretch * 0.2, 24)}px`)
      hero.style.setProperty('--side-y', `${directionX * Math.min(stretch * 0.2, 24)}px`)
    }

    const setInitialPosition = () => {
      const x = window.innerWidth * 0.56
      const y = window.innerHeight * 0.52
      targetRef.current = { x, y }
      currentRef.current = { x, y }
      lastPointerRef.current = { x, y, time: performance.now() }
      hero.style.setProperty('--cursor-x', `${x}px`)
      hero.style.setProperty('--cursor-y', `${y}px`)
      hero.style.setProperty('--reveal-w', '270px')
      hero.style.setProperty('--reveal-h', '250px')
      hero.style.setProperty('--tail-x', '0px')
      hero.style.setProperty('--tail-y', '0px')
      hero.style.setProperty('--side-x', '0px')
      hero.style.setProperty('--side-y', '0px')
      setPointer(x, y)
    }

    const handlePointerMove = (event: PointerEvent) => {
      setPointer(event.clientX, event.clientY)
    }

    let animationFrame = 0
    const animate = () => {
      const current = currentRef.current
      const target = targetRef.current
      current.x += (target.x - current.x) * 0.28
      current.y += (target.y - current.y) * 0.28

      const mask = maskRef.current
      const figure = figureRef.current

      if (mask && figure) {
        const blend = getProximityBlend(target, figure.getBoundingClientRect(), mask)
        const revealing = blend > 0.04

        if (revealing !== isRevealingRef.current) {
          isRevealingRef.current = revealing
          setIsRevealing(revealing)
        }

        hero.style.setProperty('--reveal-intensity', `${blend}`)
      }

      animationFrame = requestAnimationFrame(animate)
    }

    setInitialPosition()
    window.addEventListener('resize', setInitialPosition)
    window.addEventListener('pointermove', handlePointerMove)
    animationFrame = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', setInitialPosition)
      window.removeEventListener('pointermove', handlePointerMove)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  const imageStyle: HeroStyle = {
    '--human-image': `url(${humanImage})`,
    '--ai-image': `url(${aiImage})`,
  }

  const handleGoToFax = () => setAppPhase('fax')
  const handleAnalysisStart = () => setAppPhase('analyzing')
  const handleAnalysisComplete = () => setAppPhase('results')

  const showHero = appPhase === 'hero'
  const showFax = appPhase === 'fax'
  const showAnalysis = appPhase === 'analyzing'
  const showResults = appPhase === 'results'

  return (
    <main className="app-shell">
      {/* ===== HERO SECTION ===== */}
      <div className={`experience-track ${showHero ? '' : 'slide-away'}`}>
        <section
          ref={heroRef}
          className={`hero ${isRevealing ? 'is-revealing' : ''}`}
          style={imageStyle}
        >
          <div className="cinema-smoke">
            <SmokeBackground smokeColor="#5c4dff" />
          </div>
          <div className="red-smoke">
            <SmokeBackground smokeColor="#d3212d" />
          </div>
          <div className="heat-bloom" aria-hidden="true" />
          <div className="ember-field" aria-hidden="true" />
          <div className="digital-grid" />
          <div className="particle-field" />

          <section className="hero-copy">
            <p className="eyebrow">AIN&apos;T CAPPIN</p>
            <h1>
              Detect What&apos;s Real.
              <span>Expose What&apos;s Not.</span>
            </h1>
            <p className="subcopy">AI-powered verification that separates facts from hallucinations.</p>
            <button
              type="button"
              className="cta-button"
              onClick={handleGoToFax}
            >
              Try Detection
            </button>
          </section>

          <div ref={figureRef} className="figure-stage" aria-hidden="true">
            <div className="figure-layer human-layer" />
            <div className="figure-layer ai-layer" />
            <div className="figure-layer ai-layer glitch glitch-red" />
            <div className="figure-layer ai-layer glitch glitch-blue" />
            <div className="scanlines" />
          </div>

          <div className="cursor-aura" aria-hidden="true" />
          <div className="warning-stack" aria-hidden={!isRevealing}>
            <span>ANOMALY DETECTED</span>
            <span>AI GENERATED</span>
            <span>VERIFYING SOURCE...</span>
          </div>
        </section>
      </div>

      {/* ===== FAX MACHINE SECTION ===== */}
      {(showFax || showAnalysis) && (
        <section className={`fax-page ${showAnalysis ? 'fade-behind' : 'enter'}`}>
          <div className="fax-page-bg">
            <SmokeBackground smokeColor="#1a3a8f" />
          </div>
          <div className="fax-page-grid" />

          <div className="fax-page-header">
            <p className="fax-page-eyebrow">SOURCE VERIFICATION</p>
            <h2 className="fax-page-title">Feed the Machine</h2>
            <p className="fax-page-subtitle">Insert your document and pull the lever to initiate AI content analysis.</p>
          </div>

          <div className="fax-stage">
            <FaxMachine
              onAnalysisStart={handleAnalysisStart}
              onFileSelected={(file) => setSelectedFile(file)}
            />
          </div>

          <button
            type="button"
            className="fax-back-btn"
            onClick={() => setAppPhase('hero')}
          >
            ← Back
          </button>
        </section>
      )}

      {/* ===== ANALYSIS OVERLAY ===== */}
      <DocumentAnalysis
        active={showAnalysis}
        onComplete={handleAnalysisComplete}
      />

      {/* ===== RESULTS PAGE ===== */}
      {showResults && (
        <section className="results-page">
          <div className="results-bg">
            <SmokeBackground smokeColor="#0f4a2e" />
          </div>
          <div className="results-grid" />
          <div className="results-content">
            <div className="results-icon-wrap">
              <svg className="results-check-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="32" cy="32" r="28" strokeOpacity="0.3" />
                <path d="M20 33l8 8 16-17" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="results-eyebrow">ANALYSIS COMPLETE</p>
            <h2 className="results-title">Verification Report</h2>
            <p className="results-subtitle">
              Your document has been analyzed. 11 claims verified as factual, 5 claims flagged for review.
            </p>

            <div className="results-stats">
              <div className="result-stat verified">
                <span className="result-stat-number">11</span>
                <span className="result-stat-label">Verified</span>
              </div>
              <div className="results-divider" />
              <div className="result-stat flagged">
                <span className="result-stat-number">5</span>
                <span className="result-stat-label">Flagged</span>
              </div>
            </div>

            <div className="results-score">
              <div className="score-ring">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="327"
                    strokeDashoffset="112"
                    className="score-arc"
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="score-center">
                  <span className="score-value">69</span>
                  <span className="score-unit">%</span>
                </div>
              </div>
              <span className="score-label">Credibility Score</span>
            </div>

            <button
              type="button"
              className="results-cta"
              onClick={() => setAppPhase('fax')}
            >
              Scan Another Document
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
