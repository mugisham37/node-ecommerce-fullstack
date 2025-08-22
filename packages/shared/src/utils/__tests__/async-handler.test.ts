import { asyncHandler, wrapAsync, trpcAsyncHandler } from '../async-handler';

describe('Async Handler Utils', () => {
  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const mockNext = jest.fn();
      const handler = asyncHandler(mockFn);

      await handler({}, {}, mockNext);

      expect(mockFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and pass errors to next', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const mockNext = jest.fn();
      const handler = asyncHandler(mockFn);

      await handler({}, {}, mockNext);

      expect(mockFn).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('wrapAsync', () => {
    it('should handle successful async function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = wrapAsync(mockFn);

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should re-throw errors', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = wrapAsync(mockFn);

      await expect(wrappedFn()).rejects.toThrow('Test error');
    });
  });

  describe('trpcAsyncHandler', () => {
    it('should handle successful async function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = trpcAsyncHandler(mockFn);

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should preserve and re-throw errors for tRPC', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = trpcAsyncHandler(mockFn);

      await expect(wrappedFn()).rejects.toThrow('Test error');
    });
  });
});