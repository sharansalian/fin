import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './BlogReadingToolkit.module.css';

export default function BlogReadingToolkit() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          Back
        </button>
        <div className={styles.navBrand}>
          <div className={styles.navIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span>Pocket</span>
        </div>
        {!loading && !user && (
          <button className={`btn-primary ${styles.ctaBtn}`} onClick={() => navigate('/login')}>
            Try Pocket free
          </button>
        )}
      </nav>

      <article className={styles.article}>
        <header className={styles.header}>
          <div className={styles.tag}>Editor's Pick</div>
          <h1 className={styles.title}>
            Why a Reading List Is the Most Underrated Habit You're Not Building
          </h1>
          <p className={styles.subtitle}>
            The browser tabs don't count. The "send to myself" emails don't count.
            Here's why a dedicated reading practice — with the right tool — is one of the highest-leverage habits you can build.
          </p>
          <div className={styles.meta}>
            <span>By the Pocket team</span>
            <span className={styles.dot}>·</span>
            <span>8 min read</span>
            <span className={styles.dot}>·</span>
            <span>March 2026</span>
          </div>
        </header>

        <div className={styles.content}>
          <p>
            Right now, you probably have at least a dozen browser tabs open that you've been meaning to read.
            Maybe a few links saved in a notes app from six months ago. An email you forwarded to yourself.
            A screenshot of a tweet with a link you never clicked.
          </p>
          <p>
            This is the modern reading graveyard. And most of us live in it.
          </p>
          <p>
            The intention to read is everywhere. The act of reading is rare. And the gap between them —
            that's exactly what a reading list closes, if you build the habit correctly.
          </p>

          <h2>The problem with tabs</h2>
          <p>
            Browser tabs feel productive. You've curated them. You <em>meant</em> to read those.
            But tabs are a form of self-deception: they give you the psychological reward of "saving"
            without requiring you to actually engage with the content.
          </p>
          <p>
            Worse, every open tab is a low-grade cognitive tax. Research on attention consistently shows
            that unfinished tasks occupy working memory — a phenomenon called the Zeigarnik effect.
            Those 14 open tabs aren't just sitting there. They're quietly draining you.
          </p>
          <p>
            A reading list — a real one, in a dedicated tool — solves this. You save the link, the tab
            closes, and your brain registers the task as parked rather than pending. The anxiety lifts.
            The article waits.
          </p>

          <h2>Why "I'll read it later" works when you mean it</h2>
          <p>
            The phrase "read it later" has a bad reputation because most apps built around it failed
            the second half of the promise. They were great at "save" and terrible at "read."
          </p>
          <p>
            The reading experience was an afterthought — cluttered with ads, distractions, tiny fonts,
            no audio option. So people saved articles and never came back to them.
          </p>
          <p>
            The habit collapses when reading feels like work. It thrives when reading feels like a reward.
            That means clean typography, no distractions, a font size you actually enjoy, and — increasingly —
            the option to listen instead of read.
          </p>
          <p>
            Commute. Gym. Dishes. Walking the dog. These are all dead time that a reading list with
            text-to-speech converts into absorbed ideas.
          </p>

          <h2>Compounding knowledge vs. compounding noise</h2>
          <p>
            Naval Ravikant has a line that stuck with me: <em>"Reading is the foundation of learning.
            If you want to be smarter, read more."</em> Simple. Obvious. Almost always ignored.
          </p>
          <p>
            But there's a compounding dynamic here that isn't obvious. Reading one good article doesn't
            change you. Reading one good article per day for a year creates a new version of you.
            The ideas cross-pollinate. A piece about cognitive science connects to something you read
            last month about organizational behavior. A blog post about startups reframes a problem
            you've been stuck on.
          </p>
          <p>
            This compounding only happens if you actually <em>read</em> what you save. Which means the
            tool matters. The friction matters. The experience matters.
          </p>

          <h2>The best reading habits share three traits</h2>
          <p>
            After looking at how consistent readers operate, three patterns emerge:
          </p>
          <ol>
            <li>
              <strong>They separate saving from reading.</strong> The act of saving an article is
              completely decoupled from reading it. Save happens in the moment, in-context.
              Reading happens in a dedicated window — morning coffee, lunch, commute.
              Mixing the two destroys both.
            </li>
            <li>
              <strong>They read across formats.</strong> Some mornings you want to read. Some
              mornings you want to listen. Constraining yourself to one format means skipping
              days when the format doesn't fit your mood or situation. Audio reading eliminates
              90% of skipped reading sessions.
            </li>
            <li>
              <strong>They use tags ruthlessly.</strong> Not to organize — to filter.
              A tag like <code>deep-work</code> or <code>startup</code> means you can pull up
              a relevant reading list in 10 seconds when you have 10 minutes in a specific headspace.
              Tagging on save takes 3 seconds. Finding the right thing to read takes 0.
            </li>
          </ol>

          <h2>Why this moment matters</h2>
          <p>
            Mozilla Pocket shut down in July 2025. Omnivore shut down in November 2024.
            The read-later space suddenly has a gap where its best-known tools used to be.
          </p>
          <p>
            We built Pocket because we were Pocket users who lost access to our reading lists.
            We're not a big company with quarterly targets. We're profitable from subscriber one.
            We don't have any incentive to sell your data, flood you with content you didn't ask for,
            or recommend articles based on what makes us money.
          </p>
          <p>
            The reading list you build here is yours. The habit you build here is yours.
          </p>

          <h2>How to start today</h2>
          <p>
            The best time to build a reading habit was five years ago. The second best time is now.
            But habits only stick when friction is low:
          </p>
          <ol>
            <li>Create a free account. It takes 30 seconds.</li>
            <li>Save the next three articles you find interesting instead of opening them immediately.</li>
            <li>Block 15 minutes tomorrow morning (or any recurring slot) and read one of them.</li>
            <li>Listen to the second one on your commute.</li>
            <li>Tag both so you know what topic you were exploring.</li>
          </ol>
          <p>
            That's the whole system. Five steps. Fifteen minutes a day.
            The compounding takes care of the rest.
          </p>
        </div>

        <div className={styles.cta}>
          <div className={styles.ctaIcon}>
            <Bookmark size={24} />
          </div>
          {loading ? null : user ? (
            <>
              <div>
                <h3 className={styles.ctaTitle}>Back to your list</h3>
                <p className={styles.ctaSub}>Save articles you find interesting and read them later.</p>
              </div>
              <button className={`btn-primary ${styles.ctaButton}`} onClick={() => navigate('/')}>
                My List
                <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <div>
                <h3 className={styles.ctaTitle}>Start your reading list today</h3>
                <p className={styles.ctaSub}>Free forever. No credit card. No trial expiry.</p>
              </div>
              <button className={`btn-primary ${styles.ctaButton}`} onClick={() => navigate('/login')}>
                Get started free
                <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
