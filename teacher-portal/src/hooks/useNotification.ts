import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/uiSlice';

export const useNotification = () => {
  const dispatch = useDispatch();

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    dispatch(addNotification({
      type,
      message,
    }));
  };

  return { showNotification };
};