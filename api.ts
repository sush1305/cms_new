import { User, Program, Term, Lesson, Asset, CatalogProgram } from './types';

const API_BASE_URL = import.meta.env.VITE_API_SERVER || import.meta.env.VITE_API_URL || '';

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Log effective API base for debugging in browser console
    try {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.info('API base:', API_BASE_URL || '(empty) — using current origin');
      }
      // DO NOT read token from localStorage - require explicit login
      // const saved = (typeof window !== 'undefined' && localStorage.getItem('auth_token')) || null;
      // if (saved) this.token = saved;
    } catch (err) {
      // ignore localStorage errors in non-browser env
      console.warn('CRITICAL: Failed to read auth token from localStorage', err?.message || err);
    }
  }

  setToken(token: string | null) {
    this.token = token;
    try {
      if (typeof window !== 'undefined') {
        if (token) localStorage.setItem('auth_token', token);
        else localStorage.removeItem('auth_token');
      }
    } catch (err) {
      console.warn('CRITICAL: Failed to write to localStorage', err?.message || err);
    }
  }

  logout() {
    this.setToken(null);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Try to parse JSON error body for clearer messages
      let body: any = null;
      try {
        body = await response.json();
      } catch (e) {
        // ignore JSON parse errors
      }
      const message = body?.error || body?.message || `${response.status} ${response.statusText}`;
      const err: any = new Error(message);
      err.status = response.status;
      err.body = body;
      throw err;
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  // Programs
  async getPrograms(): Promise<Program[]> {
    return this.request<Program[]>('/api/programs');
  }

  async createProgram(program: Omit<Program, 'id' | 'created_at' | 'updated_at'>): Promise<Program> {
    return this.request<Program>('/api/programs', {
      method: 'POST',
      body: JSON.stringify(program),
    });
  }

  async updateProgram(id: string, program: Partial<Program>): Promise<Program> {
    return this.request<Program>(`/api/programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(program),
    });
  }

  async deleteProgram(id: string): Promise<void> {
    return this.request<void>(`/api/programs/${id}`, {
      method: 'DELETE',
    });
  }

  // Terms
  async getTerms(programId: string): Promise<Term[]> {
    return this.request<Term[]>(`/api/programs/${programId}/terms`);
  }

  async createTerm(term: Omit<Term, 'id' | 'created_at'>): Promise<Term> {
    return this.request<Term>(`/api/programs/${term.program_id}/terms`, {
      method: 'POST',
      body: JSON.stringify(term),
    });
  }

  async deleteTerm(programId: string, termId: string): Promise<void> {
    return this.request<void>(`/api/programs/${programId}/terms/${termId}`, {
      method: 'DELETE'
    });
  }

  // Lessons
  async getLessons(termId: string): Promise<Lesson[]> {
    return this.request<Lesson[]>(`/api/terms/${termId}/lessons`);
  }

  // Single program getter
  async getProgram(id: string): Promise<Program> {
    return this.request<Program>(`/api/programs/${id}`);
  }

  // Topics
  async getTopics(): Promise<{id: string, name: string}[]> {
    return this.request<{id: string, name: string}[]>('/api/topics');
  }

  async getLesson(id: string): Promise<Lesson> {
    return this.request<Lesson>(`/api/lessons/${id}`);
  }

  async createLesson(lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>): Promise<Lesson> {
    return this.request<Lesson>(`/api/terms/${lesson.term_id}/lessons`, {
      method: 'POST',
      body: JSON.stringify(lesson),
    });
  }

  async updateLesson(id: string, lesson: Partial<Lesson>): Promise<Lesson> {
    return this.request<Lesson>(`/api/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lesson),
    });
  }

  async deleteLesson(id: string): Promise<void> {
    return this.request<void>(`/api/lessons/${id}`, {
      method: 'DELETE',
    });
  }

  // Assets
  async getAssets(parentId: string): Promise<Asset[]> {
    return this.request<Asset[]>(`/api/assets?parent_id=${parentId}`);
  }

  async createAsset(asset: Omit<Asset, 'id'>): Promise<Asset> {
    return this.request<Asset>('/api/assets', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/api/users');
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    return this.request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    return this.request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string): Promise<void> {
    return this.request<void>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Catalog
  async getCatalog(): Promise<CatalogProgram[]> {
    return this.request<CatalogProgram[]>('/api/catalog/programs');
  }

  // Health
  async getHealth(): Promise<any> {
    return this.request<any>('/api/health');
  }
}

export const api = new ApiClient();
