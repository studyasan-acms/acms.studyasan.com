/**
 * Fast In-Memory Real-time Whiteboard Cache Service
 * 
 * Stores temporary real-time classroom session whiteboard strokes
 * completely in-memory for sub-millisecond latency, avoiding heavy
 * PostgreSQL disk writes/locks during live classes.
 */

export interface CachedStroke {
  id: string;
  tool: string;
  color?: string;
  size?: number;
  points?: any;
  text?: string;
  imageUrl?: string;
  board?: number;
  tableRows?: number;
  tableCols?: number;
  tableData?: any;
  timestamp: number;
  updatedAt: number;
}

class WhiteboardCacheService {
  // Map of janusRoomId/roomId -> Map<strokeId, CachedStroke>
  private rooms: Map<string, Map<string, CachedStroke>> = new Map();
  // Track last active timestamp for automatic cleanup
  private roomLastActive: Map<string, number> = new Map();

  constructor() {
    // Periodic garbage collector: cleanup rooms idle for more than 12 hours
    setInterval(() => {
      const now = Date.now();
      const MAX_IDLE_TIME = 12 * 60 * 60 * 1000;
      for (const [roomId, lastActive] of this.roomLastActive.entries()) {
        if (now - lastActive > MAX_IDLE_TIME) {
          this.rooms.delete(roomId);
          this.roomLastActive.delete(roomId);
        }
      }
    }, 30 * 60 * 1000);
  }

  private normalizeKey(roomId: string | number | bigint): string {
    return String(roomId);
  }

  getStrokes(roomId: string | number | bigint): CachedStroke[] {
    const key = this.normalizeKey(roomId);
    this.roomLastActive.set(key, Date.now());
    const room = this.rooms.get(key);
    if (!room) return [];
    return Array.from(room.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  addStroke(roomId: string | number | bigint, stroke: any): CachedStroke {
    const key = this.normalizeKey(roomId);
    const now = Date.now();
    this.roomLastActive.set(key, now);

    if (!this.rooms.has(key)) {
      this.rooms.set(key, new Map());
    }
    const room = this.rooms.get(key)!;
    const existing = room.get(String(stroke.id));

    const cached: CachedStroke = {
      id: String(stroke.id),
      tool: stroke.tool || 'pen',
      color: stroke.color,
      size: stroke.size,
      points: stroke.points,
      text: stroke.text,
      imageUrl: stroke.imageUrl || stroke.image_url,
      board: stroke.board || 1,
      tableRows: stroke.tableRows || stroke.table_rows,
      tableCols: stroke.tableCols || stroke.table_cols,
      tableData: stroke.tableData || stroke.table_data,
      timestamp: existing?.timestamp || stroke.timestamp || now,
      updatedAt: now,
    };

    room.set(String(stroke.id), cached);
    return cached;
  }

  deleteStrokes(roomId: string | number | bigint, strokeIds: string[]): number {
    const key = this.normalizeKey(roomId);
    this.roomLastActive.set(key, Date.now());
    const room = this.rooms.get(key);
    if (!room) return 0;

    let count = 0;
    for (const id of strokeIds) {
      if (room.delete(String(id))) {
        count++;
      }
    }
    return count;
  }

  clearWhiteboard(roomId: string | number | bigint): void {
    const key = this.normalizeKey(roomId);
    this.roomLastActive.set(key, Date.now());
    this.rooms.delete(key);
  }
}

export const whiteboardCache = new WhiteboardCacheService();
