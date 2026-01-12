import React from 'react';
import styles from './styles.module.css';

const BUTTONDOWN_USERNAME = 'agentictinkering';

export default function SubscribeForm(): React.ReactNode {
  return (
    <section className={styles.subscribeSection}>
      <div className="container">
        <h2 className={styles.heading}>Subscribe for Updates</h2>
        <p className={styles.description}>
          Get notified when new content is published.
        </p>
        <form
          action={`https://buttondown.email/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`}
          method="post"
          target="popupwindow"
          onSubmit={() => {
            window.open(
              `https://buttondown.email/${BUTTONDOWN_USERNAME}`,
              'popupwindow'
            );
          }}
          className={styles.form}
        >
          <input
            type="text"
            name="metadata__name"
            placeholder="Your name"
            className={styles.input}
          />
          <input
            type="email"
            name="email"
            placeholder="your@email.com"
            required
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Subscribe
          </button>
        </form>
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
