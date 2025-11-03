import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { validateToken } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isLoading, error } = useAppSelector(
    (state) => state.auth
  );

  useEffect(() => {
    // Validate token on app initialization if token exists
    if (token && !isAuthenticated && !isLoading) {
      dispatch(validateToken());
    }
  }, [token, isAuthenticated, isLoading, dispatch]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
  };
};