import { useNavigate } from '@tanstack/react-router';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import artwork from '../../../../../assets/brand/nextround-splash.png';

export function Home() {
  const navigate = useNavigate();
  return (
    <main className="home page">
      <section className="home-intro">
        <h1>Your next round starts here.</h1>
        <p>
          Make time to move. Choose your workout, find your rhythm, and take it one round at a time.
        </p>
      </section>
      <section className="workout-choice" aria-labelledby="emom-title">
        <div className="workout-choice-copy">
          <Clock3 size={32} aria-hidden="true" />
          <h2 id="emom-title">
            Every minute.
            <br />A fresh start.
          </h2>
          <p>
            EMOM gives each movement a minute. Finish your reps, recover, then go again at the beep.
          </p>
          <Button onClick={() => void navigate({ to: '/emom' })}>
            Build an EMOM <ArrowUpRight size={18} />
          </Button>
          <span className="home-footnote">Your movements. Your pace. No account needed.</span>
        </div>
        <img className="home-art" src={artwork} alt="NextRound timer artwork in a gym" />
      </section>
    </main>
  );
}
