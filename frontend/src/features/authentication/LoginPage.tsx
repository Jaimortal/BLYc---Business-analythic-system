import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark } from '../../components/BrandMark';
import { LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        throw new Error('Please enter both your email and password.');
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Invalid email or password credentials.');
      }

      // Navigate to main workspace upon successful login
      navigate('/workspace/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light p-3">
      <div className="blyc-card p-4 p-md-5 w-100" style={{ maxWidth: '440px' }}>
        <div className="text-center mb-4">
          <BrandMark variant="dark" size="lg" />
          <p className="text-muted-blyc mt-2" style={{ fontSize: '0.9rem' }}>
            Sign in to access your business analytics workspace
          </p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>
            <AlertCircle size={16} className="me-2 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label fw-medium" style={{ fontSize: '0.875rem' }}>
              Email address
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="name@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <div className="d-flex justify-content-between">
              <label className="form-label fw-medium" style={{ fontSize: '0.875rem' }}>
                Password
              </label>
            </div>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-blyc-primary w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-3 pt-3 border-top" style={{ fontSize: '0.875rem' }}>
          <span className="text-muted-blyc">Don't have an account? </span>
          <Link to="/register" className="fw-semibold text-decoration-none" style={{ color: '#1E3A8A' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};
