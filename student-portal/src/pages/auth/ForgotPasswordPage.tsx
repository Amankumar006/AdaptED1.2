import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../../store'
import { authAPI } from '../../services/api/authAPI'
import { addNotification } from '../../store/slices/uiSlice'

export const ForgotPasswordPage = () => {
  const dispatch = useDispatch<AppDispatch>()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await authAPI.forgotPassword(email)
      setIsSubmitted(true)
      dispatch(addNotification({
        type: 'success',
        title: 'Reset Link Sent',
        message: 'Check your email for password reset instructions.',
        duration: 5000,
      }))
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        title: 'Request Failed',
        message: error.response?.data?.message || 'Failed to send reset email',
        duration: 5000,
      }))
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setIsSubmitted(false)}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              try again
            </button>
          </p>
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Forgot your password?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="loading-spinner mr-2"></div>
                Sending reset link...
              </div>
            ) : (
              'Send reset link'
            )}
          </button>
        </div>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  )
}