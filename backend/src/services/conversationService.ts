import { PromptService } from './promptService.js';

interface Message { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date; }
interface Session { id: string; userId?: number; messages: Message[]; createdAt: Date; expiresAt: Date; }

export class ConversationService {
  private static sessions = new Map<string, Session>();
  private static readonly TIMEOUT = 2 * 60 * 60 * 1000;

  static createSession(userId?: number): string {
    const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.sessions.set(id, { id, userId, messages: [], createdAt: new Date(), expiresAt: new Date(Date.now() + this.TIMEOUT) });
    this.clean();
    return id;
  }

  static getSession(id: string): Session | null {
    const s = this.sessions.get(id);
    if (!s || new Date() > s.expiresAt) { this.sessions.delete(id); return null; }
    return s;
  }

  static addMessage(sessionId: string, role: Message['role'], content: string): void {
    const s = this.getSession(sessionId);
    if (!s) return;
    s.messages.push({ id: `m_${Date.now()}`, role, content, timestamp: new Date() });
    if (s.messages.length > 50) s.messages.splice(0, s.messages.length - 50);
  }

  static getConversationHistory(sessionId: string, max = 10): Message[] {
    const s = this.getSession(sessionId);
    return s ? s.messages.filter(m => m.role !== 'system').slice(-max) : [];
  }

  static generateContextAwarePrompt(sessionId: string, currentInput: string): string {
    const s = this.getSession(sessionId);
    if (!s || s.messages.length === 0) return PromptService.getTextAnalysisPrompt();
    const history = this.getConversationHistory(sessionId, 5);
    return PromptService.getConversationPrompt(history.map(m => ({ role: m.role, content: m.content })));
  }

  static getUserSessions(userId: number): Session[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId && new Date() <= s.expiresAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private static clean(): void {
    const now = new Date();
    for (const [id, s] of this.sessions) { if (now > s.expiresAt) this.sessions.delete(id); }
  }
}
