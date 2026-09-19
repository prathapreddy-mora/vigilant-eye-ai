// This file is a mock that acts like supabase but fetches from our local Express backend.

export interface SupabaseResponse<T = any> {
  data: T | null;
  error: Error | null;
  count?: number;
}

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000`;
  }
  return 'http://127.0.0.1:5000';
};

class SupabaseQueryBuilder implements PromiseLike<SupabaseResponse> {
  table: string;
  query: any;

  constructor(table: string) {
    this.table = table;
    this.query = { table, action: 'select', data: null, filters: [], limit: null, order: [], single: false, cols: '*' };
  }

  select(cols?: string, options?: { count?: string; head?: boolean }): this {
    this.query.cols = cols || '*';
    return this;
  }

  insert(data: any): this {
    this.query.action = 'insert';
    this.query.data = data;
    return this;
  }

  update(data: any): this {
    this.query.action = 'update';
    this.query.data = data;
    return this;
  }

  upsert(data: any): this {
    this.query.action = 'upsert';
    this.query.data = data;
    return this;
  }

  delete(): this {
    this.query.action = 'delete';
    return this;
  }
  
  eq(col: string, val: any): this {
    this.query.filters.push({ type: 'eq', col, val });
    return this;
  }

  in(col: string, vals: any[]): this {
    this.query.filters.push({ type: 'in', col, vals });
    return this;
  }

  gt(col: string, val: any): this {
    this.query.filters.push({ type: 'gt', col, val });
    return this;
  }

  gte(col: string, val: any): this {
    this.query.filters.push({ type: 'gte', col, val });
    return this;
  }

  not(col: string, op: string, val: any): this {
    this.query.filters.push({ type: 'not', col, op, val });
    return this;
  }
  
  limit(l: number): this {
    this.query.limit = l;
    return this;
  }

  order(col: string, opts = {}): this {
    this.query.order.push({ col, ...opts });
    return this;
  }

  maybeSingle(): this {
    this.query.single = true;
    return this;
  }

  single(): this {
    this.query.single = true;
    return this;
  }

  then<TResult1 = SupabaseResponse, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return fetch(`${getBackendUrl()}/api/supabase`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('sb-access-token') : ''}` 
      },
      body: JSON.stringify(this.query)
    })
    .then(r => r.json())
    .then(onfulfilled as any)
    .catch(onrejected as any);
  }
}

export const supabase = {
  from: (table: string) => new SupabaseQueryBuilder(table),
  auth: {
    signInWithPassword: async ({ email, password }: any): Promise<any> => {
      const res = await fetch(`${getBackendUrl()}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error) return { error: new Error(data.error.message) };
      localStorage.setItem('sb-access-token', data.data.session.access_token);
      return data;
    },
    signUp: async ({ email, password, options }: any): Promise<any> => {
      const res = await fetch(`${getBackendUrl()}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: options?.data?.full_name })
      });
      const data = await res.json();
      if (data.error) return { error: new Error(data.error.message) };
      localStorage.setItem('sb-access-token', data.data.session.access_token);
      return data;
    },
    getSession: async (): Promise<any> => {
      if (typeof window === 'undefined') return { data: { session: null } };
      const token = localStorage.getItem('sb-access-token');
      if (!token) return { data: { session: null } };
      const res = await fetch(`${getBackendUrl()}/api/auth/session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data;
    },
    getUser: async (): Promise<any> => {
      if (typeof window === 'undefined') return { data: { user: null }, error: new Error("No token") };
      const token = localStorage.getItem('sb-access-token');
      if (!token) return { data: { user: null }, error: new Error("No token") };
      const res = await fetch(`${getBackendUrl()}/api/auth/session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return { data: { user: data.data?.session?.user || null }, error: null };
    },
    updateUser: async ({ password }: any): Promise<any> => {
      const token = localStorage.getItem('sb-access-token');
      if (!token) return { error: new Error("No token") };
      const res = await fetch(`${getBackendUrl()}/api/auth/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.error) return { error: new Error(data.error.message) };
      return data;
    },
    signOut: async (): Promise<any> => {
      if (typeof window !== 'undefined') localStorage.removeItem('sb-access-token');
      return { error: null };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void): any => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  channel: (name: string): any => {
    const ch = {
      on: (event: string, filter: { event: string; schema: string; table: string }, callback: () => void) => ch,
      subscribe: () => {}
    };
    return ch;
  },
  removeChannel: (ch: any): void => {}
};
