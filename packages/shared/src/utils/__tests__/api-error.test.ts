import { ApiError } from '../api-error';

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create error with default values', () => {
      const error = new ApiError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.status).toBe('error');
    });

    it('should create error with custom values', () => {
      const error = new ApiError('Bad request', 400, false);
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(false);
      expect(error.status).toBe('fail');
    });

    it('should set status to "fail" for 4xx errors', () => {
      const error = new ApiError('Client error', 404);
      expect(error.status).toBe('fail');
    });

    it('should set status to "error" for 5xx errors', () => {
      const error = new ApiError('Server error', 500);
      expect(error.status).toBe('error');
    });
  });

  describe('static methods', () => {
    it('should create badRequest error', () => {
      const error = ApiError.badRequest('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should create unauthorized error', () => {
      const error = ApiError.unauthorized();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('should create forbidden error', () => {
      const error = ApiError.forbidden();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    it('should create notFound error', () => {
      const error = ApiError.notFound('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('should create conflict error', () => {
      const error = ApiError.conflict();
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Conflict');
    });

    it('should create unprocessableEntity error', () => {
      const error = ApiError.unprocessableEntity();
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Unprocessable Entity');
    });

    it('should create tooManyRequests error', () => {
      const error = ApiError.tooManyRequests();
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too Many Requests');
    });

    it('should create internal error', () => {
      const error = ApiError.internal();
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal Server Error');
    });

    it('should create serviceUnavailable error', () => {
      const error = ApiError.serviceUnavailable();
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Service Unavailable');
    });
  });

  describe('inheritance', () => {
    it('should be instance of Error', () => {
      const error = new ApiError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should have stack trace', () => {
      const error = new ApiError('Test');
      expect(error.stack).toBeDefined();
    });
  });
});