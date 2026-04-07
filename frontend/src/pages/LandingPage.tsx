import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────
   Electro-Logix  ·  Landing Page
   Inspired by WA Solutions – dark-navy premium SaaS look
───────────────────────────────────────────────────────── */

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [navHidden, setNavHidden] = useState(false);
    const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
    const [accuracyCount, setAccuracyCount] = useState(80);

    // Dynamic counter effect
    useEffect(() => {
        if (visibleSections.has('perf-stat')) {
            let current = 80;
            const target = 99;
            const timer = setInterval(() => {
                current += 1;
                if (current >= target) {
                    setAccuracyCount(target);
                    clearInterval(timer);
                } else {
                    setAccuracyCount(current);
                }
            }, 60);
            return () => clearInterval(timer);
        } else {
            setAccuracyCount(80);
        }
    }, [visibleSections]);

    // Parallax Refs for Floating Cards
    const badgeRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const amountRef = useRef<HTMLDivElement>(null);

    // Navbar scroll logic (split into 3, and hide/show)
    useEffect(() => {
        let lastScrollY = window.scrollY;

        const onScroll = () => {
            const currentScrollY = window.scrollY;

            // Parallax scale updates (reversed to shrink out)
            const getScale = (factor: number) => Math.max(0, 1 - currentScrollY * factor);
            if (badgeRef.current) badgeRef.current.style.transform = `scale(${getScale(0.0003)})`;
            if (statusRef.current) statusRef.current.style.transform = `scale(${getScale(0.00045)})`;
            if (amountRef.current) amountRef.current.style.transform = `scale(${getScale(0.0006)})`;
            
            // Split past 40px
            setScrolled(currentScrollY > 40);

            // Hide/Show logic
            if (currentScrollY > lastScrollY && currentScrollY > 200) {
                // Scrolling down past threshold -> hide
                setNavHidden(true);
            } else if (currentScrollY < lastScrollY) {
                // Scrolling up -> show
                setNavHidden(false);
            }

            // Always show near top
            if (currentScrollY <= 100) {
                setNavHidden(false);
            }

            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Intersection Observer for scroll-in animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.target.id) {
                        setVisibleSections(prev => new Set([...prev, entry.target.id]));
                    }
                });
            },
            { threshold: 0.12 }
        );
        document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const isVisible = (id: string) => visibleSections.has(id);



    const stats = [
        { value: '99.9%', label: 'System Uptime', sub: 'Always available when you need it' },
        { value: '< 1s', label: 'Alert Response', sub: 'Real-time WebSocket notifications' },
        { value: '3', label: 'Access Tiers', sub: 'Admin · Manager · Staff roles' },
        { value: '∞', label: 'Products', sub: 'Unlimited SKU management' },
    ];

    const workflow = [
        { step: '01', title: 'Register & Configure', desc: 'Set up your organisation, create user accounts, and define categories for your electronic product lines.' },
        { step: '02', title: 'Onboard Suppliers', desc: 'Verify supplier credentials, assign product categories, and establish automated reorder workflows.' },
        { step: '03', title: 'Track & Transact', desc: 'Log stock movements in real time. Staff process sales; managers approve bulk transactions.' },
        { step: '04', title: 'Analyse & Optimise', desc: 'Use the analytics dashboard to spot trends, reduce dead stock, and maximise inventory ROI.' },
    ];

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                .lp-root {
                    font-family: 'Inter', sans-serif;
                    background: #07071a;
                    color: #fff;
                    overflow-x: hidden;
                }

                /* ── NAVBAR ── */
                .lp-nav {
                    position: fixed;
                    top: 20px; left: 50%; transform: translateX(-50%);
                    z-index: 100;
                    display: flex; align-items: center; justify-content: space-between;
                    
                    /* Merged appearance */
                    padding: 8px 12px;
                    border-radius: 100px;
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(28px) saturate(1.5);
                    -webkit-backdrop-filter: blur(28px) saturate(1.5);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                    width: min(1060px, 94vw);
                    
                    transition: all 1.0s cubic-bezier(0.22, 1, 0.36, 1);
                }
                
                .lp-nav.hidden {
                    transform: translateX(-50%) translateY(-150%);
                    opacity: 0;
                    pointer-events: none;
                }

                .nav-part {
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 100px;
                    /* Starts transparent for merged look */
                    background: transparent;
                    border: 1px solid transparent;
                    backdrop-filter: blur(0px) saturate(1);
                    -webkit-backdrop-filter: blur(0px) saturate(1);
                    box-shadow: none;
                    transition: all 1.0s cubic-bezier(0.22, 1, 0.36, 1);
                }

                /* Specific padding for merged alignment */
                .part-brand { padding: 4px 20px; }
                .part-links { padding: 4px 20px; gap: 42px; }
                .part-cta   { padding: 2px; }

                /* SCROLLED SPLIT APPEARANCE */
                .lp-nav.scrolled-split {
                    background: transparent;
                    border-color: transparent;
                    backdrop-filter: blur(0px) saturate(1);
                    -webkit-backdrop-filter: blur(0px) saturate(1);
                    box-shadow: none;
                    /* Expand significantly to physically separate pills to the extremes */
                    width: calc(100vw - 80px);
                    max-width: 1700px;
                }

                .lp-nav.scrolled-split .nav-part {
                    /* Gain individual pill glassmorphism */
                    background: rgba(12, 12, 40, 0.55);
                    backdrop-filter: blur(24px) saturate(1.5);
                    -webkit-backdrop-filter: blur(24px) saturate(1.5);
                    border: 1px solid rgba(99,102,241,0.25);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }

                /* Slightly distinct paddings when split to look independently balanced elements */
                .lp-nav.scrolled-split .part-brand { padding: 14px 34px; }
                .lp-nav.scrolled-split .part-links { padding: 14px 44px; }
                .lp-nav.scrolled-split .part-cta   { padding: 4px; }

                /* Hover effect for pills */
                .lp-nav.scrolled-split .nav-part:hover {
                    background: rgba(18, 18, 55, 0.7);
                    border-color: rgba(99,102,241,0.45);
                    transform: translateY(-2px);
                    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
                }
                .lp-nav-brand {
                    font-size: 21px; font-weight: 700;
                    background: linear-gradient(135deg,#c7d2fe,#818cf8);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    background-clip: text;
                    letter-spacing: -0.01em;
                    white-space: nowrap;
                }
                /* .lp-nav-links is handled by .part-links */
                .lp-nav-link {
                    font-size: 15px; font-weight: 500;
                    color: rgba(203,213,225,0.75);
                    text-decoration: none;
                    transition: color 0.2s;
                    cursor: pointer;
                    background: none; border: none;
                }
                .lp-nav-link:hover { color: #fff; }
                .lp-nav-cta {
                    padding: 11px 26px;
                    border-radius: 100px;
                    background: linear-gradient(135deg,#6366f1,#4f46e5);
                    color: #fff; font-size: 15px; font-weight: 700;
                    border: none; cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    box-shadow: 0 0 20px rgba(99,102,241,0.4);
                }
                .lp-nav-cta:hover {
                    transform: translateY(-1px) scale(1.03);
                    box-shadow: 0 4px 28px rgba(99,102,241,0.55);
                }

                /* ── HERO ── */
                .lp-hero {
                    min-height: 100vh;
                    display: flex; align-items: center;
                    position: relative; overflow: hidden;
                    padding: 120px 4vw 80px;
                }
                .hero-bg {
                    position: absolute; inset: 0; pointer-events: none;
                }
                .hero-bg::before {
                    content: '';
                    position: absolute; inset: 0;
                    background:
                        radial-gradient(ellipse 700px 500px at 15% 40%, rgba(99,102,241,0.18) 0%, transparent 60%),
                        radial-gradient(ellipse 500px 400px at 85% 55%, rgba(59,130,246,0.14) 0%, transparent 60%),
                        radial-gradient(ellipse 400px 300px at 50% 5%, rgba(139,92,246,0.1) 0%, transparent 50%);
                }
                .hero-grid {
                    position: absolute; inset: 0;
                    background-image:
                        linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px);
                    background-size: 52px 52px;
                }
                .hero-inner {
                    position: relative; z-index: 2;
                    display: grid; grid-template-columns: 1fr 1fr;
                    gap: 64px; align-items: center;
                    max-width: 1500px; margin: 0 auto; width: 100%;
                }
                .hero-left {}
                .hero-badge {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 6px 16px; border-radius: 100px;
                    background: rgba(99,102,241,0.12);
                    border: 1px solid rgba(99,102,241,0.3);
                    font-size: 12px; font-weight: 600;
                    color: #a5b4fc; letter-spacing: 0.08em;
                    text-transform: uppercase; margin-bottom: 28px;
                }
                .hero-badge-dot {
                    width: 6px; height: 6px; border-radius: 50%;
                    background: #818cf8;
                    animation: pulse-dot 2s ease-in-out infinite;
                }
                @keyframes pulse-dot {
                    0%,100% { opacity:1; transform: scale(1); }
                    50% { opacity:0.5; transform: scale(1.4); }
                }
                .hero-h1 {
                    font-size: clamp(48px,5.5vw,84px);
                    font-weight: 500; line-height: 1.08;
                    letter-spacing: -0.04em;
                    margin-bottom: 24px;
                }
                .hero-h1-white { color: #f1f5f9; }
                .hero-h1-grad {
                    background: linear-gradient(135deg,#818cf8 0%,#6366f1 40%,#60a5fa 100%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .hero-sub {
                    font-size: 20px; line-height: 1.7;
                    color: rgba(148,163,184,0.9);
                    margin-bottom: 40px; max-width: 760px;
                }
                .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }
                .btn-primary-lg {
                    padding: 15px 36px; border-radius: 12px;
                    background: linear-gradient(135deg,#6366f1,#4f46e5);
                    color: #fff; font-size: 15px; font-weight: 600;
                    border: none; cursor: pointer;
                    transition: all 0.25s ease;
                    box-shadow: 0 4px 24px rgba(99,102,241,0.45);
                    display: flex; align-items: center; gap: 8px;
                }
                .btn-primary-lg:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 36px rgba(99,102,241,0.6);
                }
                .btn-ghost-lg {
                    padding: 15px 32px; border-radius: 12px;
                    background: transparent;
                    color: rgba(203,213,225,0.9);
                    font-size: 15px; font-weight: 600;
                    border: 1px solid rgba(148,163,184,0.2);
                    cursor: pointer; transition: all 0.2s ease;
                }
                .btn-ghost-lg:hover {
                    border-color: rgba(99,102,241,0.5);
                    color: #fff;
                    background: rgba(99,102,241,0.06);
                }

                /* Hero visual – outer wrapper for strap frame */
                .hero-visual {
                    position: relative;
                    /* Padding lets straps peek out on left, bottom, right */
                    padding: 0 36px 36px 0;
                }

                /* ── STRAPS ── */
                /* Large indigo backing rectangle — peeks left + bottom */
                .strap-bg {
                    position: absolute;
                    top: 28px; bottom: -28px;
                    left: -16px; right: 60px;
                    background: linear-gradient(145deg, #6366f1 0%, #4f46e5 60%, #4338ca 100%);
                    border-radius: 24px;
                    z-index: 0;
                    box-shadow: 0 8px 40px rgba(99,102,241,0.35);
                }
                /* Dark navy triangle — top-right corner notch */
                .strap-notch-tr {
                    position: absolute;
                    top: 0; right: 36px;
                    width: 110px; height: 130px;
                    background: #07071a;
                    clip-path: polygon(0 0, 100% 0, 100% 100%);
                    border-radius: 0 28px 0 0;
                    z-index: 2;
                }
                /* Dark navy triangle — bottom-right corner notch */
                .strap-notch-br {
                    position: absolute;
                    bottom: 0; right: 36px;
                    width: 100px; height: 100px;
                    background: #07071a;
                    clip-path: polygon(100% 0, 100% 100%, 0 100%);
                    border-radius: 0 0 28px 0;
                    z-index: 2;
                }
                /* Blue accent right‑side strap */
                .strap-right {
                    position: absolute;
                    top: 10%; bottom: 10%;
                    right: 0;
                    width: 36px;
                    background: linear-gradient(180deg, #3b82f6 0%, #6366f1 100%);
                    border-radius: 0 16px 16px 0;
                    z-index: 0;
                }
                /* Thinner second strap next to it */
                .strap-right-2 {
                    position: absolute;
                    top: 22%; bottom: 22%;
                    right: 36px;
                    width: 16px;
                    background: rgba(99,102,241,0.5);
                    border-radius: 0 8px 8px 0;
                    z-index: 0;
                }

                /* Hero right – photo + overlay cards */
                .hero-right {
                    position: relative;
                    z-index: 1;
                    height: 520px;
                    border-radius: 28px;
                    overflow: hidden;
                }
                /* Diagonal corner accents like WA Solutions */
                .hero-right::before {
                    content: '';
                    position: absolute;
                    inset: 0; z-index: 1;
                    background:
                        linear-gradient(225deg, rgba(99,102,241,0.55) 0%, transparent 35%),
                        linear-gradient(45deg,  rgba(99,102,241,0.45) 0%, transparent 30%);
                    pointer-events: none;
                }
                .hero-photo {
                    width: 100%; height: 100%;
                    object-fit: cover;
                    display: block;
                    border-radius: 28px;
                    filter: brightness(1.15) saturate(1.1);
                }
                /* Overlay cards – static glassmorphism */
                .ov-card {
                    position: absolute; z-index: 3;
                    backdrop-filter: blur(20px) saturate(1.4);
                    -webkit-backdrop-filter: blur(20px) saturate(1.4);
                    border-radius: 16px;
                    padding: 14px 18px;
                    font-family: 'Inter', sans-serif;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.15);
                    transition: transform 0.2s cubic-bezier(0.1, 0.7, 0.1, 1);
                }
                /* Top-left: shipment badge */
                .ov-badge {
                    top: 20px; left: 20px;
                    background: rgba(255,255,255,0.18);
                    border: 1px solid rgba(255,255,255,0.28);
                    display: flex; align-items: center; gap: 10px;
                    padding: 10px 16px;
                }
                .ov-badge-dot {
                    width: 22px; height: 22px; border-radius: 50%;
                    background: #6366f1;
                    display: flex; align-items: center; justify-content: center;
                    color: #fff; font-size: 11px; font-weight: 700; flex-shrink: 0;
                }
                .ov-badge-text {
                    font-size: 13px; font-weight: 700; color: #fff;
                }
                /* Bottom-left: delivery status card */
                .ov-status {
                    bottom: 24px; left: 20px;
                    background: rgba(15,20,60,0.35);
                    border: 1px solid rgba(255,255,255,0.18);
                    min-width: 210px;
                }
                .ov-status-header {
                    display: flex; align-items: center; gap: 10px;
                    margin-bottom: 12px;
                }
                .ov-status-logo {
                    width: 28px; height: 28px; border-radius: 8px;
                    background: #6366f1;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 13px; color: #fff; font-weight: 800;
                }
                .ov-status-title { font-size: 13px; font-weight: 700; color: #fff; }
                .ov-status-divider {
                    height: 2px;
                    background: linear-gradient(90deg,#6366f1,#60a5fa);
                    border-radius: 2px; margin-bottom: 12px;
                }
                .ov-status-row {
                    display: flex; align-items: center; gap: 8px;
                    margin-bottom: 8px;
                }
                .ov-status-check {
                    width: 16px; height: 16px; border-radius: 50%;
                    background: #6366f1;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 9px; color: #fff; flex-shrink: 0;
                }
                .ov-status-empty {
                    width: 16px; height: 16px; border-radius: 50%;
                    border: 2px solid #cbd5e1; flex-shrink: 0;
                }
                .ov-status-text { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); }
                .ov-status-text.pending { color: rgba(255,255,255,0.45); font-weight: 400; }
                /* Bottom-right: received amount */
                .ov-amount {
                    bottom: 24px; right: 20px;
                    background: rgba(10,10,40,0.35);
                    border: 1px solid rgba(99,102,241,0.28);
                    min-width: 170px;
                }
                .ov-amount-label {
                    display: flex; align-items: center; gap: 6px;
                    font-size: 11px; font-weight: 600;
                    color: rgba(148,163,184,0.8);
                    margin-bottom: 6px;
                }
                .ov-amount-check {
                    width: 14px; height: 14px; border-radius: 50%;
                    background: #6366f1;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 8px; color: #fff;
                }
                .ov-amount-value {
                    font-size: 28px; font-weight: 700;
                    letter-spacing: -0.02em; color: #f1f5f9;
                    margin-bottom: 4px;
                }
                .ov-amount-sub {
                    font-size: 11px; color: rgba(148,163,184,0.6);
                }

                /* ── SECTION BASE ── */
                .lp-section { padding: 100px 4vw; }
                .lp-section.light {
                    background: #f8fafc;
                    color: #0f172a;
                }
                .section-inner { max-width: 1500px; margin: 0 auto; }

                .section-eyebrow {
                    display: inline-flex; align-items: center; gap: 8px;
                    font-size: 12px; font-weight: 700;
                    letter-spacing: 0.15em; text-transform: uppercase;
                    margin-bottom: 16px;
                }
                .eyebrow-dark { color: #818cf8; }
                .eyebrow-dark::before {
                    content: ''; display: inline-block;
                    width: 28px; height: 2px; border-radius: 2px;
                    background: linear-gradient(90deg,#6366f1,#60a5fa);
                }
                .eyebrow-light { color: #6366f1; }
                .eyebrow-light::before {
                    content: ''; display: inline-block;
                    width: 28px; height: 2px; border-radius: 2px;
                    background: linear-gradient(90deg,#6366f1,#60a5fa);
                }

                .section-h2-dark {
                    font-size: clamp(38px,4vw,58px);
                    font-weight: 500; line-height: 1.12;
                    letter-spacing: -0.03em; color: #f1f5f9;
                    margin-bottom: 16px;
                }
                .section-h2-light {
                    font-size: clamp(38px,4vw,58px);
                    font-weight: 500; line-height: 1.12;
                    letter-spacing: -0.03em; color: #0f172a;
                    margin-bottom: 16px;
                }
                .section-sub-dark {
                    font-size: 19px; color: rgba(148,163,184,0.85);
                    line-height: 1.65; max-width: 520px; margin-bottom: 56px;
                }
                .section-sub-light {
                    font-size: 19px; color: #475569;
                    line-height: 1.65; max-width: 520px; margin-bottom: 56px;
                }

                /* ── FEATURES SPLIT (WA-style sticky-left / scroll-right) ── */
                .features-split-section {
                    padding: 100px 4vw;
                    background: #07071a;
                }
                .features-split-inner {
                    max-width: 1500px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: 480px 1fr;
                    gap: 80px;
                    align-items: start;
                }
                /* Sticky left panel */
                .features-left-sticky {
                    position: sticky;
                    top: 110px;
                    align-self: start;
                }
                .feat-eyebrow {
                    display: inline-flex; align-items: center; gap: 8px;
                    font-size: 11px; font-weight: 700;
                    letter-spacing: 0.15em; text-transform: uppercase;
                    color: #818cf8; margin-bottom: 20px;
                }
                .feat-eyebrow::before {
                    content: ''; display: inline-block;
                    width: 6px; height: 6px; border-radius: 50%;
                    background: #818cf8;
                }
                .feat-sticky-h2 {
                    font-size: clamp(36px, 3.5vw, 54px);
                    font-weight: 500; line-height: 1.12;
                    letter-spacing: -0.03em;
                    color: #f1f5f9; margin-bottom: 18px;
                }
                .feat-sticky-sub {
                    font-size: 18px; line-height: 1.7;
                    color: rgba(148,163,184,0.8);
                    margin-bottom: 36px;
                }
                .feat-cta {
                    display: inline-flex; align-items: center; gap: 10px;
                    padding: 13px 28px; border-radius: 10px;
                    background: linear-gradient(135deg,#6366f1,#4f46e5);
                    color: #fff; font-size: 14px; font-weight: 600;
                    border: none; cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 20px rgba(99,102,241,0.4);
                }
                .feat-cta:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 28px rgba(99,102,241,0.55);
                }
                .feat-cta-arrow {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 26px; height: 26px; border-radius: 6px;
                    background: rgba(255,255,255,0.18);
                    font-size: 14px;
                }

                /* Right scrollable list */
                .features-right-scroll-wrap {
                    position: relative;
                }
                /* Fade hint at bottom */
                .features-right-scroll-wrap::after {
                    content: '';
                    position: absolute;
                    bottom: 0; left: 0; right: 0;
                    height: 72px;
                    background: linear-gradient(to bottom, transparent, #07071a);
                    pointer-events: none;
                    z-index: 2;
                    border-radius: 0 0 12px 12px;
                }
                .features-row-list {
                    display: flex; flex-direction: column;
                    height: 480px;
                    overflow-y: auto;
                    padding-right: 0;
                    /* Hide scrollbar everywhere */
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .features-row-list::-webkit-scrollbar {
                    display: none;
                }
                .feature-row {
                    display: grid;
                    grid-template-columns: 56px 1fr;
                    gap: 24px;
                    padding: 36px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.07);
                    transition: background 0.2s;
                }
                .feature-row:first-child { border-top: 1px solid rgba(255,255,255,0.07); }
                .feature-row:hover .feat-row-icon-wrap {
                    border-color: rgba(99,102,241,0.5);
                    background: rgba(99,102,241,0.12);
                }
                .feat-row-icon-wrap {
                    width: 48px; height: 48px; border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.04);
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; margin-top: 2px;
                    transition: all 0.25s ease;
                }
                .feat-row-icon-wrap svg {
                    width: 22px; height: 22px;
                    stroke: #818cf8;
                    fill: none;
                    stroke-width: 1.6;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                .feat-row-title {
                    font-size: 20px; font-weight: 600;
                    color: #f1f5f9; margin-bottom: 8px;
                    letter-spacing: -0.005em;
                }
                .feat-row-desc {
                    font-size: 17px; line-height: 1.7;
                    color: rgba(148,163,184,0.8);
                }

                @media (max-width: 900px) {
                    .features-split-inner { grid-template-columns: 1fr; gap: 48px; }
                    .features-left-sticky { position: static; }
                }

                /* ── PERFORMANCE – WA-Solutions style ── */
                .perf-section {
                    padding: 100px 4vw 110px;
                    background: #f4f6fa;
                    position: relative;
                    overflow: hidden;
                }
                /* subtle radial glow top-right */
                .perf-section::before {
                    content: '';
                    position: absolute;
                    top: -220px; right: -220px;
                    width: 600px; height: 600px; border-radius: 50%;
                    background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%);
                    pointer-events: none;
                }

                .perf-section-inner {
                    max-width: 1500px; margin: 0 auto;
                }

                /* TOP heading row */
                .perf-top-heading {
                    margin-bottom: 52px;
                }
                .perf-top-h2 {
                    font-size: clamp(42px, 5vw, 72px);
                    font-weight: 500; line-height: 1.1;
                    letter-spacing: -0.035em;
                    color: #0f172a;
                }
                .perf-top-h2 span {
                    background: linear-gradient(130deg, #6366f1 0%, #3b82f6 100%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                /* BODY row: mosaic left + copy right */
                .perf-body-row {
                    display: grid;
                    grid-template-columns: 1.05fr 1fr;
                    gap: 52px;
                    align-items: center;
                }

                /* ---- MOSAIC ---- */
                .perf-mosaic {
                    display: grid;
                    /* left col = large photo | right col = stat-card + photo */
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: 1fr auto;
                    gap: 14px;
                    height: 520px;
                }

                /* large tall photo – spans both rows */
                .perf-photo-main {
                    grid-column: 1;
                    grid-row: 1 / 3;
                    border-radius: 20px;
                    overflow: hidden;
                    position: relative;
                }
                .perf-photo-main img {
                    width: 100%; height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.5s ease;
                }
                .perf-photo-main:hover img { transform: scale(1.04); }

                /* top-right: blue stat card (inventory accuracy) */
                .perf-stat-card {
                    grid-column: 2;
                    grid-row: 1;
                    border-radius: 20px;
                    padding: 22px 24px 20px;
                    position: relative; overflow: hidden;
                    display: flex; flex-direction: column;
                    justify-content: space-between;
                    min-height: 0;
                    background: linear-gradient(145deg, #7fa9f5 0%, #5b84e8 30%, #4169d4 65%, #3a5bc7 100%);
                    box-shadow: 0 8px 28px rgba(65,105,212,0.35);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .perf-stat-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 40px rgba(65,105,212,0.45);
                }
                .perf-stat-card-label {
                    display: flex; align-items: center; gap: 7px;
                    font-size: 10px; font-weight: 600;
                    letter-spacing: 0.12em; text-transform: uppercase;
                    color: rgba(255,255,255,0.75);
                }
                .perf-stat-card-label-dot {
                    display: flex; align-items: center; justify-content: center;
                    width: 18px; height: 18px; border-radius: 5px;
                    border: 1.5px solid rgba(255,255,255,0.55);
                    flex-shrink: 0;
                }
                .perf-stat-card-label-dot svg {
                    width: 10px; height: 10px;
                    stroke: rgba(255,255,255,0.85); fill: none;
                    stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
                }
                .perf-stat-value {
                    font-size: 66px; font-weight: 300;
                    letter-spacing: -0.03em;
                    color: rgba(255,255,255,0.92);
                    line-height: 1;
                    margin-top: auto;
                    padding-top: 16px;
                }
                .perf-stat-value sup {
                    font-size: 28px; font-weight: 400;
                    vertical-align: super; letter-spacing: 0;
                    opacity: 0.75;
                }

                /* bottom-right: small delivery photo */
                .perf-photo-small {
                    grid-column: 2;
                    grid-row: 2;
                    border-radius: 20px;
                    overflow: hidden;
                    position: relative;
                    flex-shrink: 0;
                }
                .perf-photo-small img {
                    width: 100%; height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.5s ease;
                }
                .perf-photo-small:hover img { transform: scale(1.04); }

                /* ---- COPY (right col) ---- */
                .perf-copy {
                    display: flex; flex-direction: column;
                    justify-content: center;
                }
                .perf-copy-h3 {
                    font-size: clamp(34px, 3.5vw, 52px);
                    font-weight: 500; line-height: 1.18;
                    letter-spacing: -0.025em;
                    color: #0f172a;
                    margin-bottom: 24px;
                }
                .perf-copy-p {
                    font-size: 18px; line-height: 1.78;
                    color: #475569;
                    margin-bottom: 36px;
                    max-width: 420px;
                }
                .perf-copy-cta {
                    display: inline-flex; align-items: center; gap: 10px;
                    padding: 14px 30px; border-radius: 50px;
                    background: #0f172a;
                    color: #fff; font-size: 14px; font-weight: 600;
                    border: none; cursor: pointer;
                    transition: all 0.25s ease;
                    align-self: flex-start;
                }
                .perf-copy-cta:hover {
                    background: #1e293b;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(15,23,42,0.28);
                }
                .perf-copy-cta-icon {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 28px; height: 28px; border-radius: 50%;
                    background: rgba(255,255,255,0.15);
                    font-size: 15px;
                }

                /* Responsive */
                @media (max-width: 1024px) {
                    .perf-body-row { grid-template-columns: 1fr; gap: 48px; }
                    .perf-mosaic { height: 420px; }
                }
                @media (max-width: 640px) {
                    .perf-mosaic { height: 340px; gap: 10px; }
                    .perf-stat-value { font-size: 44px; }
                }

                /* ── WORKFLOW ── */
                .workflow-grid {
                    display: grid; grid-template-columns: repeat(4,1fr);
                    gap: 0; position: relative;
                }
                /* Faint background line */
                .workflow-grid::before {
                    content: ''; position: absolute;
                    top: 44px; left: 6%; right: 6%; height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent);
                }
                /* Animated Bright Luminant Line */
                .workflow-grid::after {
                    content: ''; position: absolute;
                    top: 43px; left: 6%; right: 6%; height: 3px;
                    background: linear-gradient(90deg, transparent 0%, #6366f1 40%, #818cf8 80%, #ffffff 100%);
                    box-shadow: 0 0 16px #818cf8, 0 0 32px #6366f1;
                    border-radius: 4px;
                    transform-origin: left center;
                    transform: scaleX(0);
                    opacity: 0;
                    transition: transform 2.8s cubic-bezier(0.25, 1, 0.36, 1) 0.3s, opacity 0.3s ease 0.3s;
                    z-index: 0;
                }
                .workflow-grid.visible::after {
                    transform: scaleX(1);
                    opacity: 1;
                }
                .workflow-item { padding: 0 20px; }
                .workflow-step-num {
                    font-size: 11px; font-weight: 600;
                    letter-spacing: 0.08em; color: #6366f1;
                    margin-bottom: 16px;
                }
                .workflow-dot {
                    width: 24px; height: 24px; border-radius: 50%;
                    background: linear-gradient(135deg,#6366f1,#4f46e5);
                    margin-bottom: 24px; position: relative; z-index: 1;
                    box-shadow: 0 0 16px rgba(99,102,241,0.5);
                }
                .workflow-title {
                    font-size: 18px; font-weight: 600;
                    color: #f1f5f9; margin-bottom: 10px;
                }
                .workflow-desc {
                    font-size: 16px; line-height: 1.65;
                    color: rgba(148,163,184,0.8);
                }

                /* ── CTA SECTION ── */
                .cta-section {
                    padding: 120px 4vw;
                    background: linear-gradient(135deg,#0d0d2b 0%,#0f1535 50%,#0a0a24 100%);
                    position: relative; overflow: hidden;
                    text-align: center;
                }
                .cta-section::before {
                    content: ''; position: absolute; inset: 0;
                    background:
                        radial-gradient(ellipse 600px 400px at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 60%),
                        radial-gradient(ellipse 400px 500px at 70% 50%, rgba(59,130,246,0.10) 0%, transparent 60%);
                    pointer-events: none;
                }
                .cta-inner { position: relative; z-index: 2; max-width: 1000px; margin: 0 auto; }
                .cta-h2 {
                    font-size: clamp(42px, 4.5vw, 68px);
                    font-weight: 500; letter-spacing: -0.03em;
                    color: #f1f5f9; margin-bottom: 20px; line-height: 1.1;
                }
                .cta-sub {
                    font-size: 20px; color: rgba(148,163,184,0.85);
                    line-height: 1.65; margin-bottom: 48px;
                    max-width: 700px; margin-left: auto; margin-right: auto;
                }

                /* ── FOOTER ── */
                .lp-footer {
                    background: #050512; padding: 48px 4vw;
                    border-top: 1px solid rgba(99,102,241,0.12);
                }
                .footer-inner {
                    max-width: 1500px; margin: 0 auto;
                    display: flex; justify-content: space-between; align-items: center;
                    flex-wrap: wrap; gap: 16px;
                }
                .footer-brand {
                    font-size: 18px; font-weight: 700;
                    background: linear-gradient(135deg,#c7d2fe,#818cf8);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .footer-copy { font-size: 13px; color: rgba(100,116,139,0.7); }

                /* ── ANIMATIONS ── */
                .fade-up {
                    opacity: 0; transform: translateY(40px);
                    transition: opacity 0.7s ease, transform 0.7s ease;
                }
                .fade-up.visible { opacity: 1; transform: translateY(0); }
                .fade-up-bl {
                    opacity: 0;
                    transform-origin: bottom left;
                    transform: translate(-50px, 50px) scale(0.5);
                    transition: opacity 1.8s ease, transform 1.8s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .fade-up-bl.visible {
                    opacity: 1; transform: translate(0, 0) scale(1);
                }
                .delay-1 { transition-delay: 0.1s; }
                .delay-2 { transition-delay: 0.2s; }
                .delay-3 { transition-delay: 0.3s; }
                .delay-4 { transition-delay: 0.4s; }
                .delay-5 { transition-delay: 0.5s; }

                /* Orbs */
                .orb {
                    position: absolute; border-radius: 50%;
                    filter: blur(80px); pointer-events: none;
                }
                .orb-hero-1 {
                    width: 380px; height: 380px;
                    background: rgba(99,102,241,0.2);
                    top: -100px; right: -80px;
                    animation: floatOrb 9s ease-in-out infinite;
                }
                .orb-hero-2 {
                    width: 250px; height: 250px;
                    background: rgba(59,130,246,0.15);
                    bottom: 80px; left: -60px;
                    animation: floatOrb 12s ease-in-out infinite reverse;
                }
                @keyframes floatOrb {
                    0%,100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-28px) scale(1.07); }
                }

                /* ── CHALLENGES SECTION ── */
                .challenges-section {
                    padding: 100px 4vw;
                    background: linear-gradient(180deg, #07071a 0%, #0a0a24 40%, #07071a 100%);
                    position: relative; overflow: hidden;
                }
                .challenges-section::before {
                    content: '';
                    position: absolute;
                    top: -200px; left: -200px;
                    width: 600px; height: 600px; border-radius: 50%;
                    background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%);
                    pointer-events: none;
                }
                .challenges-inner { max-width: 1500px; margin: 0 auto; }

                .challenges-head {
                    margin-bottom: 56px;
                }
                .challenges-h2 {
                    font-size: clamp(42px, 5vw, 72px);
                    font-weight: 500;
                    line-height: 1.1;
                    letter-spacing: -0.03em;
                    color: #f1f5f9;
                    margin-bottom: 28px;
                    max-width: 100%;
                }
                .challenges-h2-accent {
                    background: linear-gradient(135deg, #818cf8, #60a5fa);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .challenges-desc {
                    font-size: 18px;
                    line-height: 1.75;
                    color: rgba(148,163,184,0.85);
                    max-width: 520px;
                    margin-left: auto;
                }

                /* Two image cards row */
                .challenge-cards {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                .challenge-card {
                    position: relative;
                    border-radius: 20px;
                    overflow: hidden;
                    height: 340px;
                    cursor: pointer;
                }
                .challenge-card:hover .challenge-img {
                    transform: scale(1.04);
                }
                .challenge-img {
                    width: 100%; height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.5s ease;
                    filter: brightness(1.15) saturate(1.1);
                }
                .challenge-card-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(7,7,26,0.25) 100%);
                }
                .challenge-card-num {
                    position: absolute;
                    top: 20px; left: 20px;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.12em;
                    color: rgba(255,255,255,0.75);
                    background: rgba(99,102,241,0.25);
                    border: 1px solid rgba(99,102,241,0.35);
                    padding: 4px 12px;
                    border-radius: 100px;
                    backdrop-filter: blur(8px);
                }

                @media (max-width: 768px) {
                    .challenges-head { grid-template-columns: 1fr; gap: 24px; }
                    .challenge-cards { grid-template-columns: 1fr; }
                }

                /* ── RESPONSIVE (existing) ── */
                @media (max-width: 1024px) {
                    .features-grid { grid-template-columns: repeat(2,1fr); }
                    .workflow-grid { grid-template-columns: repeat(2,1fr); gap:40px; }
                    .workflow-grid::before { display: none; }
                }
                @media (max-width: 768px) {
                    .hero-inner { grid-template-columns: 1fr; }
                    .hero-right { display: none; }
                    .features-grid { grid-template-columns: 1fr; }
                    .workflow-grid { grid-template-columns: 1fr; }
                    .lp-nav-links { display: none; }
                }
            `}</style>

            <div className="lp-root">

                {/* ── NAVBAR ── */}
                <nav className={`lp-nav ${scrolled ? 'scrolled-split' : ''} ${navHidden ? 'hidden' : ''}`}>
                    <div className="nav-part part-brand">
                        <span className="lp-nav-brand">Electro‑Logix.</span>
                    </div>
                    <div className="nav-part part-links lp-nav-links">
                        <button className="lp-nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
                        <button className="lp-nav-link" onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
                        <button className="lp-nav-link" onClick={() => document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' })}>Stats</button>
                    </div>
                    <div className="nav-part part-cta">
                        <button className="lp-nav-cta" onClick={() => navigate('/login')}>Get Started →</button>
                    </div>
                </nav>

                {/* ── HERO ── */}
                <section className="lp-hero">
                    <div className="hero-bg">
                        <div className="hero-grid" />
                    </div>
                    <div className="orb orb-hero-1" />
                    <div className="orb orb-hero-2" />

                    <div className="hero-inner">
                        {/* Left */}
                        <div className="hero-left">
                            <h1 className="hero-h1">
                                <span className="hero-h1-white">Take Control of </span>
                                <br />
                                <span className="hero-h1-grad">Your Electronics</span>
                                <br />
                                <span className="hero-h1-white">Inventory.</span>
                            </h1>

                            <p className="hero-sub">
                                An inventory management solution to digitally transform the landscape of your stocked inventory.
                            </p>

                            <div className="hero-actions">
                                <button className="btn-primary-lg" onClick={() => navigate('/login')}>
                                    Get Started <span style={{ fontSize: 18 }}>→</span>
                                </button>
                                <button className="btn-ghost-lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                                    Explore Features
                                </button>
                            </div>
                        </div>

                        {/* Right – photo with overlay cards + strap frame */}
                        <div className="hero-visual">
                            {/* Background straps */}
                            <div className="strap-bg" />
                            <div className="strap-right" />
                            <div className="strap-right-2" />
                            <div className="strap-notch-tr" />
                            <div className="strap-notch-br" />

                            {/* Photo + overlay cards */}
                            <div className="hero-right">
                                <img
                                    src="/hero-team.png"
                                    alt="Team managing electronics inventory"
                                    className="hero-photo"
                                />

                                {/* Top-left badge: Stock Received */}
                                <div className="ov-card ov-badge" ref={badgeRef}>
                                    <div className="ov-badge-dot">✓</div>
                                    <span className="ov-badge-text">Stock Received</span>
                                </div>

                                {/* Bottom-left: Transaction Status */}
                                <div className="ov-card ov-status" ref={statusRef}>
                                    <div className="ov-status-header">
                                        <div className="ov-status-logo">EL</div>
                                        <span className="ov-status-title">Transaction Status</span>
                                    </div>
                                    <div className="ov-status-divider" />
                                    <div className="ov-status-row">
                                        <div className="ov-status-check">✓</div>
                                        <span className="ov-status-text">PO Dispatched</span>
                                    </div>
                                    <div className="ov-status-row">
                                        <div className="ov-status-check">✓</div>
                                        <span className="ov-status-text">Quality Checked</span>
                                    </div>
                                    <div className="ov-status-row">
                                        <div className="ov-status-empty" />
                                        <span className="ov-status-text pending">Shelved &amp; Active</span>
                                    </div>
                                </div>

                                {/* Bottom-right: Shipment value */}
                                <div className="ov-card ov-amount" ref={amountRef}>
                                    <div className="ov-amount-label">
                                        <div className="ov-amount-check">✓</div>
                                        Shipment Received
                                    </div>
                                    <div className="ov-amount-value">₹12,450</div>
                                    <div className="ov-amount-sub">Due in 3 Days · Net 30</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── CHALLENGES SECTION ── */}
                <section className="challenges-section">
                    <div className="challenges-inner">

                        {/* Header row: heading left, description right */}
                        <div
                            id="ch-head"
                            data-animate
                            className={`challenges-head fade-up ${isVisible('ch-head') ? 'visible' : ''}`}
                        >
                            <h2 className="challenges-h2">
                                Our platform was built to solve{' '}
                                <span className="challenges-h2-accent">real&#8209;world</span>{' '}inventory challenges.
                            </h2>
                            <p className="challenges-desc">
                                Whether you're aiming to reduce inventory carrying costs, streamline
                                workflows for your field teams, or eliminate waste caused by
                                inefficiencies — Electro-Logix is designed to deliver time
                                and cost savings, fast.
                            </p>
                        </div>

                        {/* Two numbered image cards */}
                        <div className="challenge-cards">
                            <div
                                id="ch-card-1"
                                data-animate
                                className={`challenge-card fade-up delay-1 ${isVisible('ch-card-1') ? 'visible' : ''}`}
                            >
                                <img src="/challenge-01.png" alt="Warehouse operations" className="challenge-img" />
                                <div className="challenge-card-overlay" />
                            </div>

                            <div
                                id="ch-card-2"
                                data-animate
                                className={`challenge-card fade-up delay-2 ${isVisible('ch-card-2') ? 'visible' : ''}`}
                            >
                                <img src="/challenge-02.png" alt="Electronics inventory management" className="challenge-img" />
                                <div className="challenge-card-overlay" />
                            </div>
                        </div>

                    </div>
                </section>

                {/* ── FEATURES (sticky-left / scrollable-right) ── */}
                <section className="features-split-section" id="features">
                    <div className="features-split-inner">

                        {/* LEFT – sticky heading + CTA */}
                        <div className="features-left-sticky">
                            <p className="feat-eyebrow">Platform Capabilities</p>
                            <h2 className="feat-sticky-h2">Everything your electronics business needs</h2>
                            <p className="feat-sticky-sub">
                                From real-time stock alerts to deep analytics — built specifically
                                for the pace and complexity of electronics inventory management.
                            </p>
                            <button className="feat-cta" onClick={() => navigate('/login')}>
                                Explore Dashboard
                                <span className="feat-cta-arrow">↗</span>
                            </button>
                        </div>

                        {/* RIGHT – fixed-height scrollable feature rows */}
                        <div className="features-right-scroll-wrap">
                            <div className="features-row-list">

                                {/* 1. Real-Time Stock Intelligence */}
                                <div className="feature-row">
                                    <div className="feat-row-icon-wrap">
                                        <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                                    </div>
                                    <div>
                                        <div className="feat-row-title">Real-Time Stock Intelligence</div>
                                        <div className="feat-row-desc">Instant visibility across every SKU, warehouse shelf, and category. Zero blind spots in your electronics inventory — updated live via WebSocket.</div>
                                    </div>
                                </div>

                                {/* 2. Advanced Analytics */}
                                <div className="feature-row">
                                    <div className="feat-row-icon-wrap">
                                        <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                                    </div>
                                    <div>
                                        <div className="feat-row-title">Advanced Analytics</div>
                                        <div className="feat-row-desc">Deep-dive dashboards with trend forecasting, demand prediction, and margin analysis — built for the fast-moving electronics product cycle.</div>
                                    </div>
                                </div>

                                {/* 3. Smart Alert System */}
                                <div className="feature-row">
                                    <div className="feat-row-icon-wrap">
                                        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                                    </div>
                                    <div>
                                        <div className="feat-row-title">Smart Alert System</div>
                                        <div className="feat-row-desc">Automated low-stock &amp; overstock alerts with configurable thresholds per product category and supplier — no more manual stock checks.</div>
                                    </div>
                                </div>

                                {/* 4. Supplier Management */}
                                <div className="feature-row">
                                    <div className="feat-row-icon-wrap">
                                        <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                    </div>
                                    <div>
                                        <div className="feat-row-title">Supplier Management</div>
                                        <div className="feat-row-desc">End-to-end supplier onboarding, verification, and performance tracking with full audit trails and category-level assignments.</div>
                                    </div>
                                </div>

                                {/* 5. Role-Based Access Control */}
                                <div className="feature-row">
                                    <div className="feat-row-icon-wrap">
                                        <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    </div>
                                    <div>
                                        <div className="feat-row-title">Role-Based Access Control</div>
                                        <div className="feat-row-desc">Granular permissions for Admins, Managers, and Staff — ensuring the right people see the right data, with full activity logging.</div>
                                    </div>
                                </div>

                                {/* 6. Transaction Lifecycle */}
                                <div className="feature-row">
                                    <div className="feat-row-icon-wrap">
                                        <svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
                                    </div>
                                    <div>
                                        <div className="feat-row-title">Transaction Lifecycle</div>
                                        <div className="feat-row-desc">Complete stock-in, stock-out, return and approval workflows with real-time WebSocket sync across all user roles and locations.</div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </section>

                {/* ── PERFORMANCE – WA-Solutions style ── */}
                <section className="perf-section" id="stats">
                    <div className="perf-section-inner">

                        {/* TOP – full-width heading */}
                        <div
                            id="perf-head"
                            data-animate
                            className={`perf-top-heading fade-up ${isVisible('perf-head') ? 'visible' : ''}`}
                        >
                            <h2 className="perf-top-h2">
                                Built for <span>performance</span><br />
                                at every scale
                            </h2>
                        </div>

                        {/* BODY ROW – mosaic left | copy right */}
                        <div className="perf-body-row">

                            {/* LEFT – mosaic grid */}
                            <div
                                id="perf-mosaic"
                                data-animate
                                className={`perf-mosaic fade-up delay-1 ${isVisible('perf-mosaic') ? 'visible' : ''}`}
                            >
                                {/* Large tall photo – col1, spans both rows */}
                                <div className="perf-photo-main">
                                    <img src="/perf-worker.png" alt="Electronics inventory professional" />
                                </div>

                                {/* Top-right: Inventory Accuracy blue stat card */}
                                <div id="perf-stat" data-animate className={`perf-stat-card fade-up-bl delay-2 ${isVisible('perf-stat') ? 'visible' : ''}`}>
                                    <div className="perf-stat-card-label">
                                        <div className="perf-stat-card-label-dot">
                                            <svg viewBox="0 0 10 10"><path d="M1 5h8M5 1v8" /><circle cx="5" cy="5" r="4" /></svg>
                                        </div>
                                        Inventory Accuracy
                                    </div>
                                    <div className="perf-stat-value">
                                        {accuracyCount}<sup>%</sup>
                                    </div>
                                </div>

                                {/* Bottom-right: small delivery photo */}
                                <div className="perf-photo-small">
                                    <img src="/perf-delivery.png" alt="Logistics and delivery management" />
                                </div>
                            </div>

                            {/* RIGHT – copy */}
                            <div
                                id="perf-copy"
                                data-animate
                                className={`perf-copy fade-up delay-2 ${isVisible('perf-copy') ? 'visible' : ''}`}
                            >
                                <h3 className="perf-copy-h3">
                                    Pushing the boundaries<br />
                                    of inventory management
                                </h3>
                                <p className="perf-copy-p">
                                    Our solutions engineers and tech experts push the boundaries of thinking around inventory management. Every product feature we offer was developed in response to specific use cases and informed by our customers’ needs. This is our technology, built for you.
                                </p>
                                <button className="perf-copy-cta" onClick={() => navigate('/login')}>
                                    Book a demo
                                    <span className="perf-copy-cta-icon">↗</span>
                                </button>
                            </div>

                        </div>
                    </div>
                </section>

                {/* ── HOW IT WORKS ── */}
                <section className="lp-section" id="workflow">
                    <div className="section-inner">
                        <div
                            id="wf-head"
                            data-animate
                            className={`fade-up ${isVisible('wf-head') ? 'visible' : ''}`}
                        >
                            <p className="section-eyebrow eyebrow-dark">How it works</p>
                            <h2 className="section-h2-dark">Up and running in four steps</h2>
                            <p className="section-sub-dark">
                                Zero complex onboarding. Get your entire electronics inventory operation live in under an hour.
                            </p>
                        </div>
                        <div id="wf-grid" data-animate className={`workflow-grid ${isVisible('wf-grid') ? 'visible' : ''}`}>
                            {workflow.map((w, i) => (
                                <div
                                    key={w.step}
                                    id={`wf-${i}`}
                                    data-animate
                                    className={`workflow-item fade-up delay-${i + 1} ${isVisible(`wf-${i}`) ? 'visible' : ''}`}
                                >
                                    <div className="workflow-step-num">{w.step}</div>
                                    <div className="workflow-dot" />
                                    <div className="workflow-title">{w.title}</div>
                                    <div className="workflow-desc">{w.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="cta-section">
                    <div className="cta-inner">
                        <p className="section-eyebrow eyebrow-dark" style={{ justifyContent: 'center' }}>Start today</p>
                        <h2 className="cta-h2">
                            Transform the way you<br />
                            manage electronics<br />
                            inventory
                        </h2>
                        <p className="cta-sub">
                            Join teams already using Electro-Logix to eliminate stock-outs, reduce overhead, and make data-driven decisions — all in one platform.
                        </p>
                        <button className="btn-primary-lg" style={{ margin: '0 auto', fontSize: 17, padding: '18px 48px', borderRadius: 14 }} onClick={() => navigate('/login')}>
                            Get Started — It's Free →
                        </button>
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <footer className="lp-footer">
                    <div className="footer-inner">
                        <span className="footer-brand">Electro‑Logix.</span>
                        <span className="footer-copy">© 2026 Electro-Logix · Intelligent Inventory Management for Electronics</span>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default LandingPage;
