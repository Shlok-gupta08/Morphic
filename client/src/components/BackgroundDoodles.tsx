import { useMemo } from 'react';

interface DoodleProps {
    className?: string;
}

export default function BackgroundDoodles({ className = '' }: DoodleProps) {
    const doodles = useMemo(() => {
        const items = [];
        const shapes = ['cart', 'bag', 'box', 'tag', 'circle', 'file', 'image', 'star', 'heart', 'gear'];

        // Even grid distribution - 10x8 grid for more coverage
        const cols = 10;
        const rows = 8;
        const cellWidth = 100 / cols;
        const cellHeight = 100 / rows;

        let shapeIndex = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Skip center zone where text is displayed (cols 3-6, rows 2-5)
                if (c >= 3 && c <= 6 && r >= 2 && r <= 5) {
                    continue;
                }

                // Place one doodle per cell, centered with small offset for variety
                const shape = shapes[shapeIndex % shapes.length];
                shapeIndex++;

                // Offset within cell for visual variety (deterministic based on position)
                const offsetX = ((r + c) % 3) * 8 - 8; // -8, 0, or 8
                const offsetY = ((r * 2 + c) % 3) * 8 - 8;

                const top = (r * cellHeight) + (cellHeight / 2) + offsetY;
                const left = (c * cellWidth) + (cellWidth / 2) + offsetX;

                // Vary size based on position
                const size = 24 + ((r + c) % 4) * 6; // 24, 30, 36, or 42
                const rotation = ((r * 3 + c * 7) % 8) * 45; // 0, 45, 90, ... 315

                items.push({ id: `${r}-${c}`, shape, top, left, size, rotation });
            }
        }
        return items;
    }, []);

    return (
        <div
            className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
            style={{ opacity: 0.15 }}
        >
            {doodles.map((doodle) => (
                <div
                    key={doodle.id}
                    className="absolute doodle-color transition-colors duration-500"
                    style={{
                        top: `${doodle.top}%`,
                        left: `${doodle.left}%`,
                        width: `${doodle.size}px`,
                        height: `${doodle.size}px`,
                        transform: `translate(-50%, -50%) rotate(${doodle.rotation}deg)`,
                    }}
                >
                    <DoodleShape shape={doodle.shape} />
                </div>
            ))}
        </div>
    );
}

function DoodleShape({ shape }: { shape: string }) {
    switch (shape) {
        case 'cart':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            );
        case 'bag':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            );
        case 'box':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            );
        case 'tag':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            );
        case 'circle':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
            );
        case 'file':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M13 2v7h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            );
        case 'image':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
        case 'star':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            );
        case 'heart':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            );
        case 'gear':
            return (
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            );
        default:
            return null;
    }
}
