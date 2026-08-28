import { useEffect, useState, useCallback } from 'react';

interface Props {
  onVerified: (verified: boolean) => void;
}

function generateChallenge(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 8) + 1;
  const b = Math.floor(Math.random() * 8) + 1;
  const ops = ['+', '-', '×'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer: number;
  let question: string;
  switch (op) {
    case '+':
      answer = a + b;
      question = `${a} + ${b}`;
      break;
    case '-':
      answer = a >= b ? a - b : b - a;
      question = a >= b ? `${a} - ${b}` : `${b} - ${a}`;
      break;
    case '×':
      answer = a * b;
      question = `${a} × ${b}`;
      break;
  }
  return { question, answer };
}

export function Captcha({ onVerified }: Props) {
  const [challenge, setChallenge] = useState<{ question: string; answer: number }>(() => generateChallenge());
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'wrong' | 'verified'>('idle');

  const reset = useCallback(() => {
    setChallenge(generateChallenge());
    setInput('');
    setStatus('idle');
    onVerified(false);
  }, [onVerified]);

  // Auto-rotate challenge every 60 seconds for freshness
  useEffect(() => {
    const timer = setInterval(() => {
      if (status !== 'verified') reset();
    }, 60000);
    return () => clearInterval(timer);
  }, [status, reset]);

  function check() {
    const value = parseInt(input, 10);
    if (isNaN(value)) {
      setStatus('wrong');
      onVerified(false);
      return;
    }
    if (value === challenge.answer) {
      setStatus('verified');
      onVerified(true);
    } else {
      setStatus('wrong');
      onVerified(false);
      setChallenge(generateChallenge());
      setInput('');
    }
  }

  if (status === 'verified') {
    return (
      <div className="captcha captcha--verified">
        <span className="captcha__check">✅ Я НЕ РОБОТ</span>
        <button className="captcha__reset" onClick={reset} title="Пройти заново">↻</button>
      </div>
    );
  }

  return (
    <div className="captcha">
      <span className="captcha__label">🤖 Я НЕ РОБОТ:</span>
      <span className="captcha__question">{challenge.question} = ?</span>
      <input
        className="captcha__input"
        type="text"
        inputMode="numeric"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
        placeholder="?"
        maxLength={3}
      />
      <button className="btn btn--ghost captcha__btn" onClick={check}>
        ПРОВЕРИТЬ
      </button>
      {status === 'wrong' && <span className="captcha__wrong">Неверно!</span>}
    </div>
  );
}
