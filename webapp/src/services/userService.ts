import { post } from './api';

export const login = async (userData: any) => {
  return await post('/api/users/login', userData);
};

export const register = async (userData: any) => {
  return await post('/api/users/register', userData);
};
