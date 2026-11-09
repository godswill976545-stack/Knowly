import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { parseVoiceTranscript } from '../lib/adviceEngine.js'

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
)

export default function VoiceInput({ onResult }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [heard, setHeard] = useState(null)
  const [error, setError] = useState(null)
  const [unsupported, setUnsupported] = useState(false)
  const recognitionRef = useRef(null)

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setListening(false)
  }, [])

  const startListening = useCallback(() => {
    setError(null)
    setHeard(null)
    setTranscript('')

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setUnsupported(true)
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = 'fr-FR'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      const current = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
      setTranscript(current)

      if (event.results[event.results.length - 1].isFinal) {
        const parsed = parseVoiceTranscript(current)
        setHeard(parsed)
        setListening(false)
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Try again.')
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow mic permission.')
      } else {
        setError(`Error: ${event.error}`)
      }
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognition.start()
    setListening(true)
  }, [])

  const confirmHeard = () => {
    if (heard) {
      onResult(heard)
      setHeard(null)
      setTranscript('')
    }
  }

  const retry = () => {
    setHeard(null)
    setTranscript('')
    setError(null)
  }

  if (unsupported) {
    return (
      <div className="rounded-[16px] border border-outline-variant bg-white p-6 text-center">
        <Icon name="mic_off" className="mb-2 text-[32px] text-on-surface-variant" />
        <p className="text-body-md text-on-surface-variant">
          Voice input is not supported in this browser. Please use Chrome or Edge.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 rounded-[20px] border border-outline-variant bg-white p-6 ambient-shadow">
        <motion.button
          onClick={listening ? stopListening : startListening}
          disabled={!!heard}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full transition ${
            listening
              ? 'bg-error text-white'
              : heard
                ? 'bg-secondary text-white'
                : 'bg-primary text-white hover:bg-primary/90'
          }`}
          whileTap={{ scale: 0.95 }}
          aria-label={listening ? 'Stop listening' : 'Start listening'}
        >
          {listening && (
            <motion.span
              className="absolute inset-0 rounded-full bg-error/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <Icon name={listening ? 'stop' : heard ? 'check' : 'mic'} className="text-[32px]" />
        </motion.button>

        <div className="text-center">
          <p className="text-body-md font-semibold text-on-surface">
            {listening ? 'Listening...' : heard ? 'Got it!' : 'Tap to speak'}
          </p>
          <p className="mt-1 text-caption text-on-surface-variant">
            {listening
              ? 'Say something like "I earned 5000 francs"'
              : heard
                ? 'Review below'
                : 'Try: "J\'ai gagné 5000 francs"'}
          </p>
        </div>

        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full rounded-xl bg-surface-container-low p-3"
            >
              <p className="text-caption text-on-surface-variant">Heard:</p>
              <p className="mt-1 text-body-md text-on-surface">"{transcript}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {heard && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-3 rounded-xl border border-secondary/30 bg-secondary-container/20 p-4"
          >
            <div className="flex items-center gap-2">
              <Icon name={heard.type ? 'check_circle' : 'help'} className={`text-[20px] ${heard.type ? 'text-secondary' : 'text-on-surface-variant'}`} />
              <span className="text-label-md font-semibold text-on-surface">
                {heard.type === 'income' ? 'Income' : heard.type === 'expense' ? 'Expense' : 'Type non reconnu'} : {heard.amount?.toLocaleString() || '?'} CFA
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmHeard}
                disabled={!heard.type || !heard.amount}
                title={!heard.type ? 'Précisez « gagné » ou « dépensé » dans votre dictée' : undefined}
                className="btn-duo btn-duo--primary flex-1 px-4 py-2.5 text-label-md disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={retry}
                className="btn-duo btn-duo--white px-4 py-2.5 text-label-md"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error-container/20 p-3 text-caption text-error">
            <Icon name="error" className="text-[18px]" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-outline-variant" />
        <span className="text-caption text-on-surface-variant">or</span>
        <div className="h-px flex-1 bg-outline-variant" />
      </div>
    </div>
  )
}
