import { useState } from "react";
import { User, Mail, Lock, UserPlus } from "lucide-react";
import { api } from "../../lib/api";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input, Alert, useToast } from "../../components/ui";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters long");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/register", { name: name.trim(), email, password });
      toast.success("Account created!", "Please sign in to continue");
      navigate("/login", {
        state: { message: "Account created successfully! Please sign in." },
      });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "Registration failed";
      setError(errorMessage);
      toast.error("Registration failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-surface/80 backdrop-blur-xl border border-gray-700 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-mono font-bold text-secondary mb-2">
              Join Robotrick
            </h1>
            <p className="text-gray-400">Create your account to get started</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {error && (
              <Alert variant="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              disabled={isLoading}
              required
              helperText="At least 2 characters"
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={isLoading}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              disabled={isLoading}
              required
              helperText="At least 6 characters"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              disabled={isLoading}
              required
            />

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              leftIcon={!isLoading && <UserPlus className="w-5 h-5" />}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-secondary hover:text-secondary-dark font-semibold transition-colors duration-300"
              >
                Sign in here
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our terms of service and
              privacy policy.
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-20 h-20 border-2 border-secondary/20 rounded-full animate-float"></div>
        <div
          className="absolute -bottom-10 -left-10 w-16 h-16 border-2 border-primary/20 rounded-lg animate-float"
          style={{ animationDirection: "reverse" }}
        ></div>
      </div>
    </div>
  );
}
