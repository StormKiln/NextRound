import { useNavigate } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateLibrary } from '@/features/templates';
import { useWorkout } from '@/state/workout';
import artwork from '../../../../../assets/brand/nextround-splash.png';

export function Home() {
  const navigate = useNavigate();
  return (
    <main className="home page">
      <section className="home-intro">
        <div>
          <h1>Your next round starts here.</h1>
          <p>
            Make time to move. Choose your workout, find your rhythm, and take it one round at a
            time.
          </p>
          <span className="home-footnote">Your movements. Your pace. No account needed.</span>
        </div>
        <img className="home-art" src={artwork} alt="NextRound timer artwork in a gym" />
      </section>
      <div className="workout-choices">
        <section className="workout-choice" aria-labelledby="emom-title">
          <div className="workout-choice-copy">
            <h2 id="emom-title">EMOM</h2>
            <h3>Every minute. A fresh start.</h3>
            <p>
              EMOM gives each movement a minute. Finish your reps, recover, then go again at the
              beep.
            </p>
            <Button onClick={() => void navigate({ to: '/emom' })}>
              Build an EMOM <ArrowUpRight size={18} />
            </Button>
          </div>
        </section>
        <section className="workout-choice" aria-labelledby="countdown-title">
          <div className="workout-choice-copy">
            <h2 id="countdown-title">Countdown</h2>
            <h3>One uninterrupted countdown.</h3>
            <p>
              Set aside time for a workout, a stretch, or a moment to recover. Move at your own
              pace.
            </p>
            <Button onClick={() => void navigate({ to: '/countdown' })}>
              Set a countdown <ArrowUpRight size={18} />
            </Button>
          </div>
        </section>
        <section className="workout-choice" aria-labelledby="intervals-title">
          <div className="workout-choice-copy">
            <h2 id="intervals-title">Intervals</h2>
            <h3>Work hard. Recover. Repeat.</h3>
            <p>
              Choose your work and rest times. Follow your movements through each round, with room
              to recover between them.
            </p>
            <Button onClick={() => void navigate({ to: '/intervals' })}>
              Build intervals <ArrowUpRight size={18} />
            </Button>
          </div>
        </section>
        <section className="workout-choice" aria-labelledby="amrap-title">
          <div className="workout-choice-copy">
            <h2 id="amrap-title">AMRAP</h2>
            <h3>Your circuit. As many rounds as possible.</h3>
            <p>
              Keep moving through your exercises until time runs out. Track your rounds and partial
              progress at your own pace.
            </p>
            <Button onClick={() => void navigate({ to: '/amrap' })}>
              Build an AMRAP <ArrowUpRight size={18} />
            </Button>
          </div>
        </section>
      </div>
      <TemplateLibrary
        onLoad={(config) => {
          if (!useWorkout.getState().loadConfig(config))
            throw new Error('Finish your active workout before loading a saved setup.');
          void navigate({
            to:
              config.type === 'amrap'
                ? '/amrap'
                : config.type === 'intervals'
                  ? '/intervals'
                  : config.type === 'countdown'
                    ? '/countdown'
                    : '/emom',
          });
        }}
      />
    </main>
  );
}
