import { UserPrincipal } from './types';

/**
 * Interface for user repository operations needed by UserDetailsService
 */
export interface UserRepository {
  findByEmailAndActive(email: string, active: boolean): Promise<UserEntity | null>;
  findByIdAndActive(id: string, active: boolean): Promise<UserEntity | null>;
}

/**
 * User entity interface (should match your database schema)
 */
export interface UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom UserDetailsService implementation for loading user-specific data
 * Used for authentication and authorization
 */
export class UserDetailsService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Load user by email (username)
   * @param email User's email address
   * @returns UserPrincipal if user exists and is active
   * @throws Error if user not found
   */
  async loadUserByUsername(email: string): Promise<UserPrincipal> {
    const user = await this.userRepository.findByEmailAndActive(email, true);
    
    if (!user) {
      throw new Error(`User not found with email: ${email}`);
    }

    return this.createUserPrincipal(user);
  }

  /**
   * Load user by ID
   * @param id User's ID
   * @returns UserPrincipal if user exists and is active
   * @throws Error if user not found
   */
  async loadUserById(id: string): Promise<UserPrincipal> {
    const user = await this.userRepository.findByIdAndActive(id, true);
    
    if (!user) {
      throw new Error(`User not found with id: ${id}`);
    }

    return this.createUserPrincipal(user);
  }

  /**
   * Create UserPrincipal from UserEntity
   * @param user User entity from database
   * @returns UserPrincipal object
   */
  private createUserPrincipal(user: UserEntity): UserPrincipal {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active,
    };
  }

  /**
   * Check if user exists and is active
   * @param email User's email address
   * @returns boolean indicating if user exists and is active
   */
  async userExistsAndActive(email: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByEmailAndActive(email, true);
      return user !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's password hash for authentication
   * @param email User's email address
   * @returns Password hash if user exists
   * @throws Error if user not found
   */
  async getUserPasswordHash(email: string): Promise<string> {
    const user = await this.userRepository.findByEmailAndActive(email, true);
    
    if (!user) {
      throw new Error(`User not found with email: ${email}`);
    }

    return user.passwordHash;
  }
}