import { useCallback, useEffect, useRef, useState } from 'react';
import Welcome from './screens/Welcome.jsx';
import GarmentSelect from './screens/GarmentSelect.jsx';
import EngineSelect from './screens/EngineSelect.jsx';
import Camera from './screens/Camera.jsx';
import Loading from './screens/Loading.jsx';
import Result from './screens/Result.jsx';
import { postTryOn } from './api.js';

// Return to Welcome after this much inactivity, wiping all images (PLAN.md §3/§10).
const IDLE_RESET_MS = 60000;

const EMPTY_SESSION = {
  garmentImage: null,
  engine: null,
  personImage: null,
  result: null, // { imageBase64, placeholder, token }
  error: null,
};

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [session, setSession] = useState(EMPTY_SESSION);
  const idleTimer = useRef(null);

  const reset = useCallback(() => {
    setSession(EMPTY_SESSION);
    setScreen('welcome');
  }, []);

  // Idle auto-reset: any pointer/key/touch activity resets the timer. The kiosk
  // returns to Welcome (clearing images) if untouched, except while generating.
  useEffect(() => {
    const bump = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      // Don't yank the screen out from under an in-flight generation.
      if (screen === 'welcome' || screen === 'loading') return;
      idleTimer.current = setTimeout(reset, IDLE_RESET_MS);
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'mousemove'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump();
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [screen, reset]);

  const runTryOn = useCallback(async (personImage) => {
    setSession((s) => ({ ...s, personImage, error: null }));
    setScreen('loading');
    try {
      const result = await postTryOn({
        engine: session.engine,
        garmentImage: session.garmentImage,
        personImage,
      });
      setSession((s) => ({ ...s, result }));
      setScreen('result');
    } catch (err) {
      setSession((s) => ({ ...s, error: err.message || 'Something went wrong.' }));
      setScreen('result');
    }
  }, [session.engine, session.garmentImage]);

  switch (screen) {
    case 'welcome':
      return <Welcome onStart={() => setScreen('upload')} />;

    case 'upload':
      return (
        <GarmentSelect
          onBack={reset}
          onNext={(garmentImage) => {
            setSession((s) => ({ ...s, garmentImage }));
            setScreen('engine');
          }}
        />
      );

    case 'engine':
      return (
        <EngineSelect
          garmentImage={session.garmentImage}
          onBack={() => setScreen('upload')}
          onSelect={(engine) => {
            setSession((s) => ({ ...s, engine }));
            setScreen('camera');
          }}
        />
      );

    case 'camera':
      return (
        <Camera
          onBack={() => setScreen('engine')}
          onCapture={runTryOn}
        />
      );

    case 'loading':
      return <Loading garmentImage={session.garmentImage} engine={session.engine} />;

    case 'result':
      return (
        <Result
          result={session.result}
          error={session.error}
          onRetry={() => setScreen('camera')}
          onStartOver={reset}
        />
      );

    default:
      return <Welcome onStart={() => setScreen('upload')} />;
  }
}
