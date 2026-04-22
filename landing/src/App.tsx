import { useState } from 'react';
import Hero from './components/Hero';
import Demo from './components/Demo';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import OptInModal from './components/OptInModal';

export default function App() {
  const [showOptIn, setShowOptIn] = useState(false);
  const [demoPhone, setDemoPhone] = useState('');

  const handleDemoComplete = (phone: string) => {
    setDemoPhone(phone);
    setTimeout(() => setShowOptIn(true), 2000);
  };

  return (
    <div className="min-h-screen">
      <Hero />
      <Demo onComplete={handleDemoComplete} />
      <HowItWorks />
      <Features />
      <Footer />

      {showOptIn && (
        <OptInModal
          phone={demoPhone}
          onClose={() => setShowOptIn(false)}
        />
      )}
    </div>
  );
}
