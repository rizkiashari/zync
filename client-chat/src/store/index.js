import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import authReducer from './authSlice';
import workspaceReducer from './workspaceSlice';
import roomsReducer from './roomsSlice';
import messagesReducer from './messagesSlice';
import usersReducer from './usersSlice';
import notificationsReducer from './notificationsSlice';
import uiReducer from './uiSlice';
import tasksReducer from './tasksSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    rooms: roomsReducer,
    messages: messagesReducer,
    users: usersReducer,
    notifications: notificationsReducer,
    ui: uiReducer,
    tasks: tasksReducer,
  },
});

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
