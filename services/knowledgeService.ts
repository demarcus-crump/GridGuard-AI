
import { notificationService } from "./notificationService";

export interface KnowledgeItem {
  id: string;
  name: string;
  type: 'CSV' | 'TEXT' | 'JSON';
  content: string;
  size: number;
  uploadDate: string;
  summary?: string;
}

const STORAGE_KEY = 'GRIDGUARD_KNOWLEDGE_V1';

class KnowledgeService {
  private store: KnowledgeItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.store = JSON.parse(saved);
        // Prune any corrupted items
        if (!Array.isArray(this.store)) this.store = [];
      }
    } catch (e) {
      console.warn("Failed to load knowledge base from storage");
      this.store = [];
    }
  }

  private saveToStorage() {
    try {
      // Browser Storage Limit Check (approx 5MB)
      // We only save metadata + first 100KB of content per file to be safe in this shell
      const safeStore = this.store.map(item => ({
        ...item,
        content: item.content.length > 50000 ? item.content.substring(0, 50000) + '...[TRUNCATED_FOR_STORAGE]' : item.content
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeStore));
    } catch (e) {
      notificationService.warning("Storage Quota Exceeded", "Knowledge Base is too large to persist locally. Some data may be lost on refresh.");
    }
  }

  public async ingestFile(file: File): Promise<KnowledgeItem | null> {
    try {
      const content = await this.readFile(file);
      const item: KnowledgeItem = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        type: file.name.endsWith('.csv') ? 'CSV' : file.name.endsWith('.json') ? 'JSON' : 'TEXT',
        content: content,
        size: file.size,
        uploadDate: new Date().toLocaleString()
      };
      
      this.store.push(item);
      this.saveToStorage();
      notificationService.success("Knowledge Ingested", `Successfully parsed ${file.name}`);
      return item;
    } catch (e) {
      notificationService.error("Ingestion Failed", "Could not read file format.");
      return null;
    }
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  public getKnowledgeBase(): KnowledgeItem[] {
    return this.store;
  }

  public deleteItem(id: string) {
    this.store = this.store.filter(i => i.id !== id);
    this.saveToStorage();
    notificationService.info("Item Deleted", "Removed from context window.");
  }

  /**
   * RAG RETRIEVAL (Simulation)
   * Since this is a frontend-only app, we don't have a Vector DB.
   * Instead, we use "In-Context Learning" by dumping the relevant raw text into the prompt.
   * For Gemini 1.5/2.0/3.0, the context window is large enough to handle full CSVs easily.
   */
  public getContext(query: string): string {
    if (this.store.length === 0) return "";

    let context = "\n\n=== [USER UPLOADED KNOWLEDGE BASE] ===\n";
    
    // Naive Retrieval: Include Everything (up to a limit) because Gemini can handle it.
    // In a real production app, we would use embeddings here.
    this.store.forEach((item, index) => {
        // Truncate large files to avoid blowing up browser memory before sending to API
        const snippet = item.content.substring(0, 50000); 
        context += `\n--- FILE ${index + 1}: ${item.name} (${item.type}) ---\n${snippet}\n`;
        if (item.content.length > 50000) context += `\n...(Truncated for bandwidth)...\n`;
    });
    
    context += "=== [END KNOWLEDGE BASE] ===\n\n";
    return context;
  }
}

export const knowledgeService = new KnowledgeService();
