import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import BackgroundDoodles from './BackgroundDoodles';

export default function LandingPage() {
    const [opacity, setOpacity] = useState(1);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {

        const handleScroll = () => {
            const scrollY = window.scrollY;
            const newOpacity = Math.max(0, 1 - scrollY / 500);
            setOpacity(newOpacity);

            // Clear existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Set new timeout to detect scroll stop
            timeoutRef.current = setTimeout(() => {
                const windowHeight = window.innerHeight;

                // Only snap if we are in the landing page area
                if (scrollY < windowHeight) {
                    // If scrolled more than 40% down, scroll to next section
                    // Otherwise scroll back to top
                    const threshold = windowHeight * 0.4;
                    const targetScroll = scrollY > threshold ? windowHeight : 0;

                    window.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }
            }, 100); // 100ms debounce
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="parallax-hero relative overflow-hidden flex flex-col items-center justify-center min-h-[100vh]" style={{ opacity }}>
            <BackgroundDoodles />
            <div className="hero-content absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                <div className="flex-1 flex flex-col items-center justify-center pt-16 md:pt-0">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="hero-title text-center px-4"
                    >
                        MORPHIC
                    </motion.h1>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="text-xl md:text-2xl font-semibold text-ink mb-6 text-center px-4"
                    >
                        Fluidity for Every Format.
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="hero-subtitle mb-12 max-w-2xl mx-auto text-center px-6"
                    >
                        Native performance meets ironclad privacy. Forge, convert, and encrypt your digital assets in a serverless workspace that runs entirely on your hardware.
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="pb-12 z-50 pointer-events-auto"
                >
                    <button
                        onClick={() => {
                            const modulesSection = document.getElementById('modules-section');
                            if (modulesSection) {
                                modulesSection.scrollIntoView({ behavior: 'smooth' });
                            } else {
                                window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
                            }
                        }}
                        className="animate-bounce cursor-pointer p-4 rounded-full hover:bg-surface-200/20 transition-all focus:outline-none focus:ring-0 pointer-events-auto"
                        aria-label="Scroll to content"
                    >
                        <ArrowDown className="w-8 h-8 text-ink-faint" />
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
