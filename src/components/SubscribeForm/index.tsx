import React, {useState, FormEvent} from 'react';
import styles from './styles.module.css';

const BUTTONDOWN_USERNAME = 'agentictinkering';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function SubscribeForm(): React.ReactNode {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('metadata__name', name);

      const response = await fetch(
        `https://buttondown.email/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        setStatus('success');
        setMessage('Thanks for subscribing! Please check your email to confirm.');
        setEmail('');
        setName('');
      } else {
        const text = await response.text();
        setStatus('error');
        if (text.includes('already subscribed')) {
          setMessage('You are already subscribed!');
        } else {
          setMessage('Something went wrong. Please try again.');
        }
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <section className={styles.subscribeSection}>
      <div className="container">
        <h2 className={styles.heading}>Subscribe for Updates</h2>
        <p className={styles.description}>
          Get notified when new content is published.
        </p>

        {status === 'success' ? (
          <div className={styles.successMessage}>{message}</div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={styles.input}
              disabled={status === 'loading'}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className={styles.input}
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              className={styles.button}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
            {status === 'error' && (
              <p className={styles.errorMessage}>{message}</p>
            )}
          </form>
        )}

        <p className={styles.privacy}>
          Powered by{' '}
          <a
            href="https://buttondown.email"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buttondown
          </a>
        </p>
      </div>
    </section>
  );
}
