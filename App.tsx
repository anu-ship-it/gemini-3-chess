import React, { useState, useMemo, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import ThreeChess from './components/ThreeChess';
import { getChessHint } from './services/geminiService';
import { GameStatus } from './types';
import { RefreshCw, Zap, Award, X, Rotate3D, Keyboard } from 'lucide-react';

const App = () => {
  // Game Logic State
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square, to: Square } | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING);
  const [boardView, setBoardView] = useState<'white' | 'black'>('white');

  // AI Advisor State
  const [hint, setHint] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);

  // Derived Board State
  const boardState = useMemo(() => {
    return game.board();
  }, [fen]);

  // Handle Square Click
  const onSquareClick = (square: Square) => {
    if (game.isGameOver()) return;

    // 1. Attempting to Move?
    if (selectedSquare && validMoves.includes(square)) {
      try {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: 'q',
        });

        if (move) {
          setFen(game.fen());
          setLastMove({ from: move.from, to: move.to });
          setSelectedSquare(null);
          setValidMoves([]);
          checkGameStatus();
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Select Piece
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }) as Move[];
      setValidMoves(moves.map(m => m.to));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const checkGameStatus = () => {
    if (game.isCheckmate()) setGameStatus(GameStatus.CHECKMATE);
    else if (game.isDraw()) setGameStatus(GameStatus.DRAW);
    else if (game.isStalemate()) setGameStatus(GameStatus.STALEMATE);
    else setGameStatus(GameStatus.PLAYING);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setGameStatus(GameStatus.PLAYING);
    setHint(null);
    setBoardView('white');
  };

  const handleGetHint = async () => {
    if (isThinking) return;
    setIsThinking(true);
    setHint(null);
    setShowHintModal(true);

    const advice = await getChessHint(fen, game.turn());
    setHint(advice);
    setIsThinking(false);
  };

  const toggleView = () => {
    setBoardView(prev => prev === 'white' ? 'black' : 'white');
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case 'r':
          resetGame();
          break;
        case 'h':
          if (!game.isGameOver()) handleGetHint();
          break;
        case 'f':
          toggleView();
          break;
        case 'escape':
          setShowHintModal(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [game, isThinking]);

  return (
    <div className="w-full h-screen relative flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white overflow-hidden font-sans">

      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
         <ThreeChess
           boardState={boardState}
           fen={fen}
           selectedSquare={selectedSquare}
           validMoves={validMoves}
           lastMove={lastMove}
           onSquareClick={onSquareClick}
           turn={game.turn()}
           view={boardView}
         />
      </div>

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
        {/* Header */}
        <div className="pointer-events-auto bg-slate-900/40 backdrop-blur-2xl p-5 rounded-2xl border border-white/10 shadow-2xl">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
            Gemini Chess 3D
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <div className={`w-3 h-3 rounded-full shadow-lg ${game.turn() === 'w' ? 'bg-white shadow-white/50' : 'bg-gray-800 border-2 border-white/30'}`} />
            <span className="text-sm font-semibold text-gray-100 uppercase tracking-wider">
              {game.turn() === 'w' ? 'White to Move' : 'Black to Move'}
            </span>
             {game.inCheck() && !game.isGameOver() && (
                <span className="ml-2 px-2.5 py-1 rounded-md text-xs font-bold bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50">
                  CHECK
                </span>
             )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pointer-events-auto">
          <div className="flex gap-3">
             <button
              onClick={toggleView}
              className="p-3.5 bg-slate-800/50 backdrop-blur-xl rounded-xl hover:bg-slate-700/60 transition-all shadow-xl border border-white/10 hover:border-blue-400/30 group"
              title="Flip Board (F)"
            >
              <Rotate3D size={20} className="text-gray-300 group-hover:text-blue-400 transition-colors group-hover:rotate-180 duration-500" />
            </button>
            <button
              onClick={resetGame}
              className="p-3.5 bg-slate-800/50 backdrop-blur-xl rounded-xl hover:bg-slate-700/60 transition-all shadow-xl border border-white/10 hover:border-blue-400/30 group"
              title="Reset Game (R)"
            >
              <RefreshCw size={20} className="text-gray-300 group-hover:text-blue-400 group-hover:rotate-180 transition-all duration-500" />
            </button>
          </div>

          <button
            onClick={handleGetHint}
            disabled={isThinking || game.isGameOver()}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 backdrop-blur-xl rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all shadow-xl hover:shadow-blue-500/50 border border-blue-400/30 group disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ask Gemini (H)"
          >
            <Zap size={20} className="text-white fill-current group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm">Ask Gemini</span>
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameStatus !== GameStatus.PLAYING && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/20 p-12 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
             <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"></div>
             <Award size={72} className="mx-auto text-yellow-400 mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] relative z-10" />
             <h2 className="text-5xl font-bold mb-3 text-white relative z-10 drop-shadow-lg">Game Over</h2>
             <p className="text-2xl text-gray-200 mb-10 capitalize font-light relative z-10">
               {gameStatus === GameStatus.CHECKMATE
                 ? <span className="text-blue-400 font-semibold">{game.turn() === 'w' ? 'Black' : 'White'} Wins!</span>
                 : gameStatus}
             </p>
             <button
               onClick={resetGame}
               className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-lg rounded-xl hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/50 transition-all relative z-10"
             >
               Play Again
             </button>
          </div>
        </div>
      )}

      {/* Gemini Hint Modal/Toast */}
      {showHintModal && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-3xl pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">
           <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-2xl border border-blue-500/30 p-7 rounded-2xl shadow-[0_0_60px_rgba(59,130,246,0.25)] relative overflow-hidden">

             {/* Decorative gradient blobs */}
             <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>

             <button
               onClick={() => setShowHintModal(false)}
               className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10 p-1 hover:bg-white/10 rounded-lg"
               title="Close (ESC)"
             >
               <X size={22} />
             </button>

             <div className="flex items-start gap-6 relative z-10">
               <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-4 rounded-xl shadow-xl shrink-0">
                 <Zap size={32} className="text-white" />
               </div>
               <div className="flex-1">
                 <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
                   Gemini Analysis
                   {isThinking && <span className="text-xs font-normal text-blue-300 animate-pulse px-2 py-1 bg-blue-500/20 rounded">Processing...</span>}
                 </h3>

                 {isThinking ? (
                   <div className="space-y-3 py-2">
                     <div className="h-3 bg-white/10 rounded w-3/4 animate-pulse"></div>
                     <div className="h-3 bg-white/10 rounded w-2/3 animate-pulse"></div>
                     <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse"></div>
                   </div>
                 ) : (
                   <div className="text-gray-100 text-base leading-relaxed whitespace-pre-line">
                     {hint}
                   </div>
                 )}
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Instructions Overlay (Footer) */}
      <div className="absolute bottom-4 left-0 w-full flex justify-center gap-8 z-10 pointer-events-none">
        <div className="flex items-center gap-6 bg-slate-900/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10">
          <span className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Left Click: Rotate
          </span>
          <span className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Right Click: Pan
          </span>
          <span className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
            Scroll: Zoom
          </span>
        </div>
        <div className="flex items-center gap-1 bg-slate-900/40 backdrop-blur-xl px-4 py-3 rounded-full border border-white/10">
          <Keyboard size={14} className="text-white/40" />
          <span className="text-white/40 text-xs uppercase tracking-wider">R: Reset • H: Hint • F: Flip</span>
        </div>
      </div>

    </div>
  );
};

export default App;
