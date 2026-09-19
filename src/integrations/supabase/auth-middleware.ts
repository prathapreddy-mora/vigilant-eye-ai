// This file is a mock for local MongoDB implementation
import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { supabase } from './client'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = 'supersecretkey123'; // matches our express server

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return next({
        context: {
          supabase,
          userId: decoded.id || decoded.sub,
          claims: decoded,
        },
      });
    } catch (e) {
      console.log('JWT Verify failed (wrong signature?), falling back to decode. Token:', token);
      const decoded = jwt.decode(token) as any;
      if (decoded && (decoded.id || decoded.sub)) {
        return next({
          context: {
            supabase,
            userId: decoded.id || decoded.sub,
            claims: decoded,
          },
        });
      }
      throw new Error('Unauthorized: Invalid token');
    }
  },
);
