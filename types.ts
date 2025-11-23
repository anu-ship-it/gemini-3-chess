import { Square, PieceSymbol, Color } from 'chess.js';

export interface BoardProps {
  fen: string;
  onMove: (from: Square, to: Square) => void;
  validMoves: Square[];
  selectedSquare: Square | null;
  onSelectSquare: (square: Square | null) => void;
  lastMove: { from: Square; to: Square } | null;
}

export interface PieceProps {
  type: PieceSymbol;
  color: Color;
  position: [number, number, number];
  square: Square;
  onClick: (e: any) => void;
  isSelected: boolean;
}

export type MoveData = {
  from: Square;
  to: Square;
  promotion?: string;
};

export enum GameStatus {
  PLAYING = 'playing',
  CHECKMATE = 'checkmate',
  DRAW = 'draw',
  STALEMATE = 'stalemate',
}
