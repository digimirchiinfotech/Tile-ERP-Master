import { useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext.jsx';

export const useSocket = () => useContext(SocketContext);
