'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <button
            onClick={toggleTheme}
            style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 9999,
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="theme-toggle-btn"
        >
            <span style={{
                transform: `rotate(${theme === 'dark' ? '0deg' : '360deg'})`,
                transition: 'transform 0.5s ease'
            }}>
                {theme === 'dark' ? '🌙' : '☀️'}
            </span>

            <style jsx>{`
                .theme-toggle-btn:hover {
                    transform: scale(1.1);
                    border-color: hsl(var(--primary));
                }
                .theme-toggle-btn:active {
                    transform: scale(0.9);
                }
            `}</style>
        </button>
    );
}
