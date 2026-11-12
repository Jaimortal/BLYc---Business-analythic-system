import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark } from '../../components/BrandMark';
import { UserPlus, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Registration failed. Please check your credentials.');
      }

      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch (err: any) {
      setError(err.message || 'An error occurred during account registration.');
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
            Get started with automated business analytics
          </p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>
            <AlertCircle size={16} className="me-2 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="mb-3">
            <label className="form-label fw-medium" style={{ fontSize: '0.875rem' }}>
              Work email address
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="founder@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium" style={{ fontSize: '0.875rem' }}>
              Create Password
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-medium" style={{ fontSize: '0.875rem' }}>
              Confirm Password
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                <UserPlus size={18} />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-3 pt-3 border-top" style={{ fontSize: '0.875rem' }}>
          <span className="text-muted-blyc">Already have an account? </span>
          <Link to="/login" className="fw-semibold text-decoration-none" style={{ color: '#1E3A8A' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
