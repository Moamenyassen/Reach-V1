/**
 * Vitest Test Setup
 * 
 * Global mocks and configuration for all tests
 */

import { vi, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Supabase client
vi.mock('../services/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            getSession: vi.fn(),
            getUser: vi.fn(),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            })),
            updateUser: vi.fn(),
            resetPasswordForEmail: vi.fn()
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(),
                    limit: vi.fn()
                })),
                order: vi.fn(() => ({
                    limit: vi.fn()
                }))
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn()
                }))
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn()
                    }))
                }))
            })),
            delete: vi.fn(() => ({
                eq: vi.fn()
            }))
        })),
        rpc: vi.fn(),
        channel: vi.fn(() => ({
            on: vi.fn(() => ({
                subscribe: vi.fn()
            }))
        })),
        removeChannel: vi.fn()
    }
}));

// Mock window.location
Object.defineProperty(window, 'location', {
    value: {
        origin: 'http://localhost:3000',
        href: 'http://localhost:3000',
        reload: vi.fn()
    },
    writable: true
});

// Mock console.warn and console.error to reduce noise in tests
// Uncomment if needed:
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});

// Clean up after each test
afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
});
