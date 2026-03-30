/**
 * AuthContext — thin compatibility shim over Redux auth state.
 * Components still call `useAuth()` as before; auth logic lives in authSlice.
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginThunk,
  registerThunk,
  logoutThunk,
  restoreSessionThunk,
  updateUser as updateUserAction,
} from '../store/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, status, initialized } = useSelector((s) => s.auth);
  const loading = !initialized;

  const login = async (email, password) => {
    const result = await dispatch(loginThunk({ email, password }));
    if (loginThunk.rejected.match(result)) throw new Error(result.payload);
    return result.payload;
  };

  const register = async (email, password, username) => {
    const result = await dispatch(registerThunk({ email, password, username }));
    if (registerThunk.rejected.match(result)) throw new Error(result.payload);
    return result.payload;
  };

  const logout = () => dispatch(logoutThunk());

  const updateUser = (updates) => dispatch(updateUserAction(updates));

  return { user, loading, status, login, register, logout, updateUser };
};

// AuthProvider now just handles session restoration on mount.
export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const initialized = useSelector((s) => s.auth.initialized);

  useEffect(() => {
    if (!initialized) {
      dispatch(restoreSessionThunk());
    }
  }, [dispatch, initialized]);

  return children;
};

export default AuthProvider;
