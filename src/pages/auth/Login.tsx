import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, LogIn, Eye, EyeOff, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../providers/AuthProvider";
import { ROUTES } from "../../constants/routes.constants";
import { Button, Input, Alert, useToast } from "../../components/ui";
import { api } from "../../lib/api";

const REMEMBER_ME_KEY = "robotrick_remembered_credentials";

type AuthView = "login" | "forgot-email" | "forgot-otp" | "forgot-done";

export default function Login() {
  // ── Login state ──────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── View (login | forgot flow) ───────────────────────────────────────────
  const [view, setView] = useState<AuthView>("login");

  // ── Forgot-password state ────────────────────────────────────────────────
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const toast = useToast();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const forgotEmailRef = useRef<HTMLInputElement>(null);

  // Load remembered credentials on mount
  useEffect(() => {
    try {
      const remembered = localStorage.getItem(REMEMBER_ME_KEY);
      if (remembered) {
        const credentials = JSON.parse(remembered);
        setEmail(credentials.email || "");
        setPassword(credentials.password || "");
        setRememberMe(true);
      }
    } catch (err) {
      console.error("Error loading remembered credentials:", err);
    }
  }, []);

  // Handle success message from location state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-focus email input on mount
  useEffect(() => {
    if (emailInputRef.current && !email) {
      emailInputRef.current.focus();
    }
  }, [email]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || ROUTES.HOME;
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Email validation
  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError(null);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(null);
    }
    if (error) {
      setError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) {
      setError(null);
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    // Validate email format
    if (!email || !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      emailInputRef.current?.focus();
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsLoading(true);

    try {
      await login({ email, password });
      
      // Save credentials if remember me is checked
      if (rememberMe) {
        try {
          localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ email, password }));
        } catch (err) {
          console.error("Error saving credentials:", err);
        }
      } else {
        // Clear saved credentials if remember me is unchecked
        try {
          localStorage.removeItem(REMEMBER_ME_KEY);
        } catch (err) {
          console.error("Error clearing credentials:", err);
        }
      }

      toast.success("Welcome back!", "Login successful");
      // The AuthProvider will handle the redirection after successful login
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Enhanced error handling
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (err?.response?.status === 401) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (err?.response?.status === 0 || err?.code === 'NETWORK_ERROR') {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (err?.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error("Login failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Forgot-password handlers ─────────────────────────────────────────────
  const validateEmailFmt = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  async function handleForgotRequest(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    if (!validateEmailFmt(forgotEmail)) {
      setForgotError("Please enter a valid email address.");
      forgotEmailRef.current?.focus();
      return;
    }
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password/request", { email: forgotEmail }, { skipAuth: true } as any);
    } catch {
      // Silent — never reveal whether email exists
    } finally {
      setForgotLoading(false);
    }
    setView("forgot-otp");
  }

  async function handleForgotConfirm(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    if (forgotOtp.length !== 6) {
      setForgotError("Please enter the 6-digit code sent to your email.");
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError("New password must be at least 8 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password/confirm", { email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPassword }, { skipAuth: true } as any);
      setView("forgot-done");
    } catch (err: any) {
      setForgotError(err?.response?.data?.message || "Invalid or expired code. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleForgotResend() {
    setForgotError(null);
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password/request", { email: forgotEmail }, { skipAuth: true } as any);
    } catch {
      // silent
    } finally {
      setForgotLoading(false);
    }
  }

  function resetForgotFlow() {
    setView("login");
    setForgotEmail("");
    setForgotOtp("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden" style={{ backgroundColor: '#cccc99' }}>
      {/* Animated Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#003300]/5 via-transparent to-[#003300]/3"></div>
      
      {/* Animated Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#003300]/5 via-transparent to-[#003300]/5 opacity-80 pointer-events-none animate-pulse-glow" />
      
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0, 51, 0, 0.08) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0, 51, 0, 0.08) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="group relative bg-gradient-to-br from-white via-white to-[#003300]/5 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out overflow-hidden cursor-default">
          {/* Animated Background Gradient on Hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#003300]/10 via-[#cccc99]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {/* Content Container — switches between login and forgot-password views */}
          <div className="relative z-10">
            <AnimatePresence mode="wait">

              {/* ── LOGIN VIEW ─────────────────────────────────────────── */}
              {view === "login" && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)' }}>
                      <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#ffffcc' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2 group-hover:scale-105 transition-transform duration-300 inline-block" style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      Welcome Back
                    </h1>
                    <p className="text-sm sm:text-base transition-colors duration-300" style={{ color: '#003300' }}>
                      Sign in to your Robotrick account
                    </p>
                  </div>

                  <form onSubmit={onSubmit} className="space-y-6" noValidate>
                    {successMessage && (
                      <Alert variant="success" onClose={() => setSuccessMessage(null)} className="animate-fade-in-up">
                        {successMessage}
                      </Alert>
                    )}
                    {error && (
                      <Alert variant="error" onClose={() => setError(null)} className="animate-fade-in-up" aria-live="assertive">
                        {error}
                      </Alert>
                    )}

                    <div>
                      <Input
                        ref={emailInputRef}
                        label="Email Address"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        leftIcon={<Mail className="w-4 h-4" />}
                        disabled={isLoading}
                        required
                        error={emailError || undefined}
                        helperText={!emailError ? "We'll never share your email" : undefined}
                        aria-label="Email address"
                        aria-describedby={emailError ? "email-error" : "email-helper"}
                        aria-invalid={!!emailError}
                      />
                      {emailError && <p id="email-error" className="sr-only" role="alert">{emailError}</p>}
                    </div>

                    <div>
                      <Input
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={handlePasswordChange}
                        leftIcon={<Lock className="w-4 h-4" />}
                        rightIcon={
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(!showPassword); }}
                            className="focus:outline-none focus:ring-2 focus:ring-[#003300]/50 rounded p-1 transition-all duration-200 hover:text-[#003300] hover:scale-110 active:scale-95 cursor-pointer"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            tabIndex={0}
                            disabled={isLoading}
                            style={{ pointerEvents: 'auto' }}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        }
                        disabled={isLoading}
                        required
                        aria-label="Password"
                        aria-describedby="password-helper"
                      />
                      <p id="password-helper" className="sr-only">Enter your account password</p>
                    </div>

                    {/* Remember Me & Forgot Password Row */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          disabled={isLoading}
                          className="w-4 h-4 rounded border-[#003300]/30 text-[#003300] focus:ring-2 focus:ring-[#003300]/50 focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Remember me"
                        />
                        <span className="text-sm font-medium transition-colors duration-200" style={{ color: '#003300' }}>
                          Remember me
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => { setForgotEmail(email); setView("forgot-email"); }}
                        className="text-sm font-medium transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-[#003300]/50 rounded px-1 cursor-pointer"
                        style={{ color: '#003300' }}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      isLoading={isLoading}
                      disabled={isLoading}
                      leftIcon={!isLoading && <LogIn className="w-5 h-5" />}
                      className="group/btn relative overflow-hidden"
                      aria-label="Sign in to your account"
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t" style={{ borderColor: '#003300' + '20' }}>
                    <p className="text-xs text-center transition-colors duration-300" style={{ color: '#003300' + '80' }}>
                      By signing in, you agree to our terms of service and privacy policy.
                    </p>
                  </div>

                  <div className="mt-6 h-1 bg-gradient-to-r from-transparent via-[#003300]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full transform scale-x-0 group-hover:scale-x-100 origin-center transition-transform duration-500" />
                </motion.div>
              )}

              {/* ── FORGOT STEP 1: Enter email ─────────────────────────── */}
              {view === "forgot-email" && (
                <motion.div
                  key="forgot-email"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={resetForgotFlow}
                    className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors duration-200 hover:opacity-70 cursor-pointer"
                    style={{ color: '#003300' }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </button>

                  <div className="text-center mb-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)' }}>
                      <KeyRound className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#ffffcc' }} />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      Forgot Password?
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: '#003300' }}>
                      Enter your email and we'll send you a verification code.
                    </p>
                  </div>

                  <form onSubmit={handleForgotRequest} className="space-y-6" noValidate>
                    {forgotError && <Alert variant="error" onClose={() => setForgotError(null)}>{forgotError}</Alert>}
                    <Input
                      ref={forgotEmailRef}
                      label="Email Address"
                      type="email"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); setForgotError(null); }}
                      leftIcon={<Mail className="w-4 h-4" />}
                      disabled={forgotLoading}
                      required
                      aria-label="Email address"
                    />
                    <Button type="submit" variant="primary" size="lg" fullWidth isLoading={forgotLoading} disabled={forgotLoading}>
                      {forgotLoading ? "Sending..." : "Send Verification Code"}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t" style={{ borderColor: '#003300' + '20' }}>
                    <p className="text-xs text-center" style={{ color: '#003300' + '80' }}>
                      Remember your password?{" "}
                      <button type="button" onClick={resetForgotFlow} className="font-semibold hover:underline cursor-pointer" style={{ color: '#003300' }}>
                        Sign in
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ── FORGOT STEP 2: OTP + new password ─────────────────── */}
              {view === "forgot-otp" && (
                <motion.div
                  key="forgot-otp"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={resetForgotFlow}
                    className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors duration-200 hover:opacity-70 cursor-pointer"
                    style={{ color: '#003300' }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </button>

                  <div className="text-center mb-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)' }}>
                      <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#ffffcc' }} />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      Check Your Email
                    </h2>
                    <p className="text-sm sm:text-base" style={{ color: '#003300' }}>
                      If that address is registered, a 6-digit code has been sent to it.
                    </p>
                  </div>

                  <form onSubmit={handleForgotConfirm} className="space-y-5" noValidate>
                    {forgotError && <Alert variant="error" onClose={() => setForgotError(null)}>{forgotError}</Alert>}

                    <div>
                      <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Verification Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d{6}"
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => { setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setForgotError(null); }}
                        placeholder="000000"
                        disabled={forgotLoading}
                        className="w-full h-14 rounded-xl border-2 border-gray-200 bg-gray-50 text-center font-mono text-3xl font-bold tracking-[0.5em] focus:outline-none focus:border-[#003300] transition-colors"
                        style={{ color: '#003300' }}
                        aria-label="6-digit verification code"
                      />
                    </div>

                    <Input
                      label="New Password"
                      type="password"
                      placeholder="At least 8 characters"
                      value={forgotNewPassword}
                      onChange={(e) => { setForgotNewPassword(e.target.value); setForgotError(null); }}
                      disabled={forgotLoading}
                      required
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      placeholder="Repeat new password"
                      value={forgotConfirmPassword}
                      onChange={(e) => { setForgotConfirmPassword(e.target.value); setForgotError(null); }}
                      disabled={forgotLoading}
                      required
                    />

                    <Button type="submit" variant="primary" size="lg" fullWidth isLoading={forgotLoading} disabled={forgotLoading}>
                      {forgotLoading ? "Resetting..." : "Reset Password"}
                    </Button>

                    <div className="flex items-center justify-between text-sm pt-1">
                      <button
                        type="button"
                        onClick={() => { setView("forgot-email"); setForgotOtp(""); setForgotError(null); }}
                        className="font-medium transition-colors hover:opacity-70 cursor-pointer"
                        style={{ color: '#6B7280' }}
                      >
                        ← Use a different email
                      </button>
                      <button
                        type="button"
                        onClick={handleForgotResend}
                        disabled={forgotLoading}
                        className="font-semibold underline underline-offset-2 transition-colors hover:opacity-70 disabled:opacity-40 cursor-pointer"
                        style={{ color: '#003300' }}
                      >
                        Resend code
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ── FORGOT STEP 3: Success ─────────────────────────────── */}
              {view === "forgot-done" && (
                <motion.div
                  key="forgot-done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="text-center py-4"
                >
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)' }}>
                    <ShieldCheck className="w-10 h-10" style={{ color: '#ffffcc' }} />
                  </div>
                  <h2 className="text-3xl font-bold mb-3" style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Password Reset!
                  </h2>
                  <p className="text-sm mb-8" style={{ color: '#003300' }}>
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                  <Button variant="primary" size="lg" fullWidth onClick={resetForgotFlow}>
                    Back to Sign In
                  </Button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Corner Decoration */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#003300]/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-[#cccc99]/30 to-transparent rounded-tr-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </div>
    </div>
  );
}
