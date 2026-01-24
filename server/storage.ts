import type { User, InsertUser, Book, BookSource } from "@shared/schema";
import { bookCatalog } from "./bookCatalog";
import { randomUUID } from "crypto";

// Storage interface for the application
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Book methods
  getAllBooks(): Promise<Book[]>;
  getBookById(id: string): Promise<Book | undefined>;
  getBooksBySource(source: BookSource): Promise<Book[]>;
  searchBooks(query: string): Promise<Book[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private books: Map<string, Book>;

  constructor() {
    this.users = new Map();
    this.books = new Map();
    
    // Initialize with book catalog
    for (const book of bookCatalog) {
      this.books.set(book.id, book);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Book methods
  async getAllBooks(): Promise<Book[]> {
    return Array.from(this.books.values());
  }

  async getBookById(id: string): Promise<Book | undefined> {
    return this.books.get(id);
  }

  async getBooksBySource(source: BookSource): Promise<Book[]> {
    return Array.from(this.books.values()).filter(
      (book) => book.source === source
    );
  }

  async searchBooks(query: string): Promise<Book[]> {
    const queryLower = query.toLowerCase();
    return Array.from(this.books.values()).filter((book) => {
      const searchText = `${book.title} ${book.author || ""} ${book.description} ${book.category || ""}`.toLowerCase();
      return searchText.includes(queryLower);
    });
  }
}

export const storage = new MemStorage();
