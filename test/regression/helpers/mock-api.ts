/**
 * External API mocking for micro.blog API endpoints
 * Following Microsoft's recommendation to mock external APIs while using real VS Code APIs
 */

import * as https from 'https';

interface MockResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

const mockResponses = new Map<string, MockResponse>();
const mockErrors = new Map<string, Error>();

export function mockApiResponse(endpoint: string, data: any, statusCode = 200): void {
    const response: MockResponse = {
        statusCode,
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(data)
    };
    mockResponses.set(endpoint, response);
}

export function mockApiError(endpoint: string, statusCode: number, headers: Record<string, string> = {}): void {
    const error = new Error(`HTTP ${statusCode} error for ${endpoint}`);
    (error as any).statusCode = statusCode;
    (error as any).headers = headers;
    mockErrors.set(endpoint, error);
}

export function clearMocks(): void {
    mockResponses.clear();
    mockErrors.clear();
}

export function setupHttpsMocks(): void {
    // Store original https.request
    const originalRequest = https.request;
    
    // Mock https.request
    (https as any).request = function(options: any, callback?: (res: any) => void) {
        const url = typeof options === 'string' ? options : `${options.protocol}//${options.hostname}${options.path}`;
        const path = typeof options === 'string' ? options : options.path;
        
        // Check for mock error first
        if (mockErrors.has(path)) {
            const error = mockErrors.get(path)!;
            setTimeout(() => {
                if (callback) {
                    const mockRes = {
                        statusCode: (error as any).statusCode,
                        headers: (error as any).headers || {},
                        on: (event: string, handler: Function) => {
                            if (event === 'data') {
                                // No data for error responses
                            } else if (event === 'end') {
                                setTimeout(() => handler(), 0);
                            }
                        }
                    };
                    callback(mockRes);
                }
            }, 0);
            
            return {
                on: (event: string, handler: Function) => {
                    // Handle request events
                },
                write: () => {},
                end: () => {}
            };
        }
        
        // Check for mock response
        if (mockResponses.has(path)) {
            const mockResponse = mockResponses.get(path)!;
            
            setTimeout(() => {
                if (callback) {
                    const mockRes = {
                        statusCode: mockResponse.statusCode,
                        headers: mockResponse.headers,
                        on: (event: string, handler: Function) => {
                            if (event === 'data') {
                                setTimeout(() => handler(Buffer.from(mockResponse.body)), 0);
                            } else if (event === 'end') {
                                setTimeout(() => handler(), 0);
                            }
                        }
                    };
                    callback(mockRes);
                }
            }, 0);
            
            return {
                on: (event: string, handler: Function) => {
                    // Handle request events
                },
                write: () => {},
                end: () => {}
            };
        }
        
        // Fall back to original request for unmocked endpoints
        return originalRequest(options, callback);
    };
}

export function restoreHttpsMocks(): void {
    // This would restore the original https.request
    // Implementation depends on how the original was stored
}

export const mockApiClient = {
    publishPost: () => Promise.resolve(),
    getConfig: () => Promise.resolve(),
    uploadMedia: () => Promise.resolve(),
    fetchUploadedMedia: () => Promise.resolve(),
    fetchPages: () => Promise.resolve(),
    verifyToken: () => Promise.resolve()
};