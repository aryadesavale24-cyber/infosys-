import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConcurrentSessionModal from '../components/ConcurrentSessionModal';
import OtpVerificationModal from '../components/OtpVerificationModal';
import { User, Lock, Loader2, Shield, Users, UserCog, Zap, BarChart3, Package } from 'lucide-react';
import { Role } from '../types';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role>(Role.STAFF);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [sessionMessage, setSessionMessage] = useState('');
    const [showConcurrentSessionModal, setShowConcurrentSessionModal] = useState(false);
    const [concurrentSessionMessage, setConcurrentSessionMessage] = useState('');
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [otpError, setOtpError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const state = location.state as { message?: string };
        if (state?.message) {
            setSessionMessage(state.message);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    const roles = [
        {
            value: Role.ADMIN,
            label: 'Admin',
            icon: Shield,
            borderColor: 'border-violet-500',
            textColor: 'text-violet-700',
            activeBg: 'bg-violet-50',
            dot: 'bg-violet-500',
        },
        {
            value: Role.MANAGER,
            label: 'Manager',
            icon: UserCog,
            borderColor: 'border-blue-500',
            textColor: 'text-blue-700',
            activeBg: 'bg-blue-50',
            dot: 'bg-blue-500',
        },
        {
            value: Role.STAFF,
            label: 'Staff',
            icon: Users,
            borderColor: 'border-emerald-500',
            textColor: 'text-emerald-700',
            activeBg: 'bg-emerald-50',
            dot: 'bg-emerald-500',
        },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login({ username, password, selectedRole });
            setFailedAttempts(0);
            navigate('/dashboard');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
            if (errorMessage.startsWith('CONCURRENT_SESSION:')) {
                const message = errorMessage.replace('CONCURRENT_SESSION:', '');
                setConcurrentSessionMessage(message);
                setShowConcurrentSessionModal(true);
                setError('');
            } else {
                setError(errorMessage);
                if (errorMessage.toLowerCase().includes('incorrect password')) {
                    setFailedAttempts(prev => prev + 1);
                } else {
                    setFailedAttempts(0);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForceLogout = async () => {
        setLoading(true);
        setError('');
        setOtpError('');
        try {
            const response = await fetch('http://localhost:8080/api/auth/force-logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, selectedRole }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Force logout failed');
            }
            const data = await response.json();
            if (data.message === 'OTP_REQUIRED') {
                setMaskedEmail(data.email);
                setShowConcurrentSessionModal(false);
                setShowOtpModal(true);
            }
        } catch (err: any) {
            setError(err.message || 'Force logout failed. Please try again.');
            setShowConcurrentSessionModal(false);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerify = async (otp: string) => {
        setLoading(true);
        setOtpError('');
        try {
            const response = await fetch('http://localhost:8080/api/auth/verify-force-logout-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, otp, selectedRole }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'OTP verification failed');
            }
            const data = await response.json();
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            setShowOtpModal(false);
            navigate('/dashboard');
            window.location.reload();
        } catch (err: any) {
            setOtpError(err.message || 'OTP verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

                .login-root {
                    font-family: 'Inter', sans-serif;
                    min-height: 100vh;
                    display: flex;
                    background: #0a0a0f;
                }

                /* ── LEFT PANEL ── */
                .login-left {
                    position: relative;
                    width: 55%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: flex-start;
                    padding: 64px 72px;
                    overflow: hidden;
                    background: linear-gradient(135deg, #0d0d1a 0%, #0f1535 40%, #0a1628 70%, #0d0d1a 100%);
                }

                /* Animated mesh background */
                .login-left::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(ellipse 600px 400px at 20% 30%, rgba(99, 102, 241, 0.18) 0%, transparent 60%),
                        radial-gradient(ellipse 400px 500px at 80% 70%, rgba(59, 130, 246, 0.12) 0%, transparent 60%),
                        radial-gradient(ellipse 300px 300px at 50% 10%, rgba(139, 92, 246, 0.10) 0%, transparent 50%);
                    pointer-events: none;
                }

                /* Animated grid overlay */
                .login-left::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px);
                    background-size: 48px 48px;
                    pointer-events: none;
                }

                .left-content {
                    position: relative;
                    z-index: 2;
                    width: 100%;
                }

                /* Glowing orb */
                .orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    pointer-events: none;
                    z-index: 1;
                }
                .orb-1 {
                    width: 320px; height: 320px;
                    background: rgba(99, 102, 241, 0.25);
                    top: -80px; right: -80px;
                    animation: floatOrb 8s ease-in-out infinite;
                }
                .orb-2 {
                    width: 200px; height: 200px;
                    background: rgba(59, 130, 246, 0.2);
                    bottom: 60px; left: -40px;
                    animation: floatOrb 11s ease-in-out infinite reverse;
                }
                @keyframes floatOrb {
                    0%, 100% { transform: translateY(0px) scale(1); }
                    50% { transform: translateY(-24px) scale(1.06); }
                }

                /* Brand logo mark */
                .brand-mark {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-bottom: 56px;
                }
                .brand-icon {
                    width: 48px; height: 48px;
                    background: linear-gradient(135deg, #6366f1, #3b82f6);
                    border-radius: 14px;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 0 24px rgba(99,102,241,0.5);
                }
                .brand-label {
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: rgba(165,180,252,0.9);
                }

                /* Main headline */
                .headline-tagline {
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    color: #818cf8;
                    margin-bottom: 20px;
                    display: flex; align-items: center; gap: 10px;
                }
                .headline-tagline::before {
                    content: '';
                    display: inline-block;
                    width: 32px; height: 2px;
                    background: linear-gradient(90deg, #6366f1, #3b82f6);
                    border-radius: 2px;
                }

                .brand-name {
                    font-size: clamp(48px, 5vw, 72px);
                    font-weight: 900;
                    line-height: 1.0;
                    letter-spacing: -0.03em;
                    background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 30%, #a5b4fc 60%, #818cf8 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin-bottom: 8px;
                    position: relative;
                }
                .brand-name-accent {
                    background: linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #a78bfa 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .brand-subtitle {
                    font-size: 16px;
                    font-weight: 400;
                    color: rgba(148,163,184,0.85);
                    margin-bottom: 48px;
                    line-height: 1.6;
                    max-width: 400px;
                }

                /* Feature pills */
                .feature-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 56px;
                }
                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .feature-icon-wrap {
                    width: 36px; height: 36px;
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .feature-icon-wrap.indigo { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.25); }
                .feature-icon-wrap.blue   { background: rgba(59,130,246,0.15);  border: 1px solid rgba(59,130,246,0.25); }
                .feature-icon-wrap.violet { background: rgba(139,92,246,0.15);  border: 1px solid rgba(139,92,246,0.25); }
                .feature-text strong {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin-bottom: 1px;
                }
                .feature-text span {
                    font-size: 12px;
                    color: rgba(148,163,184,0.7);
                }

                /* Bottom divider line */
                .left-footer {
                    width: 100%;
                    padding-top: 32px;
                    border-top: 1px solid rgba(99,102,241,0.15);
                }
                .left-footer-text {
                    font-size: 12px;
                    color: rgba(100,116,139,0.8);
                    letter-spacing: 0.05em;
                }

                /* ── RIGHT PANEL ── */
                .login-right {
                    width: 45%;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 48px 56px;
                }

                .login-form-wrap {
                    width: 100%;
                    max-width: 400px;
                }

                .form-eyebrow {
                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    color: #6366f1;
                    margin-bottom: 10px;
                }

                .form-title {
                    font-size: 30px;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 6px;
                    letter-spacing: -0.02em;
                }
                .form-desc {
                    font-size: 14px;
                    color: #64748b;
                    margin-bottom: 36px;
                }

                /* Role tabs */
                .role-tabs {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 28px;
                }
                .role-tab {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 6px;
                    border-radius: 12px;
                    border: 1.5px solid #e2e8f0;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: 'Inter', sans-serif;
                }
                .role-tab:hover {
                    border-color: #c7d2fe;
                    background: #f5f3ff;
                }
                .role-tab.active-admin  { border-color: #7c3aed; background: #f5f3ff; }
                .role-tab.active-manager{ border-color: #2563eb; background: #eff6ff; }
                .role-tab.active-staff  { border-color: #059669; background: #ecfdf5; }

                .role-tab-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #475569;
                }
                .role-tab.active-admin  .role-tab-label { color: #7c3aed; }
                .role-tab.active-manager .role-tab-label{ color: #2563eb; }
                .role-tab.active-staff  .role-tab-label { color: #059669; }

                /* Form inputs */
                .form-group {
                    margin-bottom: 18px;
                }
                .form-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 7px;
                }
                .input-wrap {
                    position: relative;
                }
                .input-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    width: 17px; height: 17px;
                }
                .form-input {
                    width: 100%;
                    padding: 11px 14px 11px 42px;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 14px;
                    font-family: 'Inter', sans-serif;
                    color: #0f172a;
                    background: #f8fafc;
                    transition: all 0.2s ease;
                    outline: none;
                    box-sizing: border-box;
                }
                .form-input:focus {
                    border-color: #6366f1;
                    background: #fff;
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
                }
                .form-input::placeholder { color: #cbd5e1; }

                /* Password row */
                .pw-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 7px;
                }
                .forgot-link {
                    font-size: 12px;
                    font-weight: 600;
                    color: #6366f1;
                    text-decoration: none;
                    transition: color 0.15s;
                }
                .forgot-link:hover { color: #4f46e5; text-decoration: underline; }

                /* Submit button */
                .submit-btn {
                    width: 100%;
                    padding: 13px;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    color: #fff;
                    font-size: 15px;
                    font-weight: 700;
                    font-family: 'Inter', sans-serif;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 24px;
                    box-shadow: 0 4px 16px rgba(99,102,241,0.35);
                }
                .submit-btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
                    box-shadow: 0 6px 24px rgba(99,102,241,0.45);
                    transform: translateY(-1px);
                }
                .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

                /* Error box */
                .error-box {
                    background: #fff1f2;
                    border: 1px solid #fecdd3;
                    border-radius: 10px;
                    padding: 12px 14px;
                    font-size: 13px;
                    color: #be123c;
                    margin-bottom: 16px;
                }

                /* Session warning */
                .session-box {
                    background: #fffbeb;
                    border-left: 3px solid #f59e0b;
                    border-radius: 8px;
                    padding: 12px 14px;
                    font-size: 13px;
                    color: #92400e;
                    margin-bottom: 20px;
                }

                /* Register link */
                .register-row {
                    text-align: center;
                    font-size: 13px;
                    color: #64748b;
                    margin-top: 24px;
                }
                .register-link {
                    color: #6366f1;
                    font-weight: 700;
                    text-decoration: none;
                    margin-left: 4px;
                    transition: color 0.15s;
                }
                .register-link:hover { color: #4f46e5; text-decoration: underline; }

                /* Responsive */
                @media (max-width: 900px) {
                    .login-left { display: none; }
                    .login-right { width: 100%; padding: 40px 24px; }
                }
            `}</style>

            <div className="login-root">

                {/* ── LEFT BRANDING PANEL ── */}
                <div className="login-left">
                    <div className="orb orb-1" />
                    <div className="orb orb-2" />

                    <div className="left-content">
                        {/* Top logo mark */}
                        <div className="brand-mark">
                            <div className="brand-icon">
                                <Package size={22} color="#fff" />
                            </div>
                            <span className="brand-label">Inventory Platform</span>
                        </div>

                        {/* Main brand name */}
                        <p className="headline-tagline">Powered by intelligence</p>
                        <h1 className="brand-name">
                            Electro<span className="brand-name-accent">-Logix.</span>
                        </h1>
                        <p className="brand-subtitle">
                            The intelligent inventory management platform built for modern enterprises. Real-time insights, seamless control.
                        </p>

                        {/* Feature list */}
                        <div className="feature-list">
                            <div className="feature-item">
                                <div className="feature-icon-wrap indigo">
                                    <Zap size={16} color="#818cf8" />
                                </div>
                                <div className="feature-text">
                                    <strong>Real-time Alerts</strong>
                                    <span>Instant stock level notifications & alerts</span>
                                </div>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrap blue">
                                    <BarChart3 size={16} color="#60a5fa" />
                                </div>
                                <div className="feature-text">
                                    <strong>Analytics Dashboard</strong>
                                    <span>Deep insights into inventory performance</span>
                                </div>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon-wrap violet">
                                    <Shield size={16} color="#a78bfa" />
                                </div>
                                <div className="feature-text">
                                    <strong>Role-Based Access</strong>
                                    <span>Granular permissions for every team member</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="left-footer">
                            <p className="left-footer-text">© 2026 Electro-Logix · Intelligent Inventory Management</p>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT FORM PANEL ── */}
                <div className="login-right">
                    <div className="login-form-wrap">

                        <p className="form-eyebrow">Welcome back</p>
                        <h2 className="form-title">Sign in to your account</h2>
                        <p className="form-desc">Select your role and enter your credentials to continue.</p>

                        {/* Session Timeout */}
                        {sessionMessage && (
                            <div className="session-box">{sessionMessage}</div>
                        )}

                        {/* Role Tabs */}
                        <div className="role-tabs" role="group" aria-label="Select role">
                            {roles.map(role => {
                                const Icon = role.icon;
                                const isSelected = selectedRole === role.value;
                                const activeClass = isSelected
                                    ? role.value === Role.ADMIN ? 'active-admin'
                                        : role.value === Role.MANAGER ? 'active-manager'
                                            : 'active-staff'
                                    : '';
                                return (
                                    <button
                                        key={role.value}
                                        type="button"
                                        onClick={() => setSelectedRole(role.value)}
                                        className={`role-tab ${activeClass}`}
                                        aria-pressed={isSelected}
                                    >
                                        <Icon
                                            size={18}
                                            color={isSelected
                                                ? role.value === Role.ADMIN ? '#7c3aed'
                                                    : role.value === Role.MANAGER ? '#2563eb'
                                                        : '#059669'
                                                : '#94a3b8'}
                                        />
                                        <span className="role-tab-label">{role.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="error-box">
                                {error.toLowerCase().includes('incorrect password') ? (
                                    <>
                                        <p style={{ fontWeight: 700, marginBottom: 4 }}>❌ Incorrect Password</p>
                                        {failedAttempts >= 3 ? (
                                            <p>
                                                Too many failed attempts.{' '}
                                                <Link to="/forgot-password" style={{ color: '#be123c', fontWeight: 700 }}>
                                                    Reset your password →
                                                </Link>
                                            </p>
                                        ) : (
                                            <p>Please enter the correct password. {failedAttempts > 0 && `(Attempt ${failedAttempts}/3)`}</p>
                                        )}
                                    </>
                                ) : error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="login-username">Username</label>
                                <div className="input-wrap">
                                    <User className="input-icon" />
                                    <input
                                        id="login-username"
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="form-input"
                                        placeholder="Enter your username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="pw-row">
                                    <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
                                    <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
                                </div>
                                <div className="input-wrap">
                                    <Lock className="input-icon" />
                                    <input
                                        id="login-password"
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="form-input"
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="submit-btn" id="login-submit-btn">
                                {loading ? (
                                    <>
                                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                        Signing in…
                                    </>
                                ) : 'Sign In'}
                            </button>
                        </form>

                        <p className="register-row">
                            Don't have an account?
                            <Link to="/register" className="register-link">Create one</Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConcurrentSessionModal
                isOpen={showConcurrentSessionModal}
                message={concurrentSessionMessage}
                onForceLogout={handleForceLogout}
                onCancel={() => setShowConcurrentSessionModal(false)}
                loading={loading}
            />
            <OtpVerificationModal
                isOpen={showOtpModal}
                maskedEmail={maskedEmail}
                onVerify={handleOtpVerify}
                onCancel={() => { setShowOtpModal(false); setOtpError(''); }}
                loading={loading}
                error={otpError}
            />

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
};

export default Login;
