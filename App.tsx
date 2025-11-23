import React, { useState, useMemo } from 'react';
import { Chess, Square, Move } from 'chess.js';
import ThreeChess from './components/ThreeChess';
import { getChessHint } from './services/geminiService';
import { GameStatus } from './types';
import { RefreshCw, Zap, Award, X, Rotate3D } from 'lucide-react';

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

  return (
    <div className="w-full h-screen relative flex flex-col bg-neutral-900 text-white overflow-hidden font-sans">
      
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
        <div className="pointer-events-auto bg-black/20 backdrop-blur-xl p-4 rounded-2xl border border-white/5 shadow-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-white/90 drop-shadow-md">Gemini Chess 3D</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${game.turn() === 'w' ? 'bg-white' : 'bg-black border border-white/20'}`} />
            <span className="text-sm font-medium text-gray-200 uppercase tracking-wider">
              {game.turn() === 'w' ? 'White to Move' : 'Black to Move'}
            </span>
             {game.inCheck() && !game.isGameOver() && (
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white animate-pulse">
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
              className="p-3 bg-neutral-900/60 backdrop-blur-md rounded-xl hover:bg-neutral-800 transition-all shadow-lg border border-white/10 group"
              title="Flip Board"
            >
              <Rotate3D size={20} className="text-gray-300 group-hover:text-white transition-colors" />
            </button>
            <button 
              onClick={resetGame}
              className="p-3 bg-neutral-900/60 backdrop-blur-md rounded-xl hover:bg-neutral-800 transition-all shadow-lg border border-white/10 group"
              title="Reset Game"
            >
              <RefreshCw size={20} className="text-gray-300 group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
          
          <button 
            onClick={handleGetHint}
            className="flex items-center gap-2 px-4 py-3 bg-indigo-600/90 backdrop-blur-md rounded-xl hover:bg-indigo-500 transition-all shadow-lg border border-indigo-400/30 group"
            title="Ask Gemini"
          >
            <Zap size={20} className="text-white fill-current group-hover:animate-pulse" />
            <span className="font-semibold text-sm">Ask Gemini</span>
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameStatus !== GameStatus.PLAYING && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-white/10 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
             <Award size={64} className="mx-auto text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
             <h2 className="text-4xl font-bold mb-2 text-white">Game Over</h2>
             <p className="text-xl text-gray-300 mb-8 capitalize font-light">
               {gameStatus === GameStatus.CHECKMATE 
                 ? <span className="text-indigo-400 font-normal">{game.turn() === 'w' ? 'Black' : 'White'} Wins!</span> 
                 : gameStatus}
             </p>
             <button 
               onClick={resetGame}
               className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl hover:scale-[1.02] hover:bg-gray-100 transition-all shadow-xl"
             >
               Play Again
             </button>
          </div>
        </div>
      )}

      {/* Gemini Hint Modal/Toast */}
      {showHintModal && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">
           <div className="bg-neutral-900/95 backdrop-blur-xl border border-indigo-500/30 p-6 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.15)] relative overflow-hidden">
             
             {/* Decorative gradient blob */}
             <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

             <button 
               onClick={() => setShowHintModal(false)}
               className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
             >
               <X size={20} />
             </button>
             
             <div className="flex items-start gap-5">
               <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shrink-0">
                 <Zap size={28} className="text-white" />
               </div>
               <div className="flex-1">
                 <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                   Gemini Analysis
                   {isThinking && <span className="text-xs font-normal text-indigo-300 animate-pulse">Processing...</span>}
                 </h3>
                 
                 {isThinking ? (
                   <div className="space-y-2 py-2">
                     <div className="h-2 bg-white/10 rounded w-3/4 animate-pulse"></div>
                     <div className="h-2 bg-white/10 rounded w-1/2 animate-pulse"></div>
                   </div>
                 ) : (
                   <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">
                     {hint}
                   </div>
                 )}
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Instructions Overlay (Footer) */}
      <div className="absolute bottom-4 left-0 w-full text-center z-10 pointer-events-none text-white/20 text-[10px] uppercase tracking-widest">
        Left Click: Rotate • Right Click: Pan • Scroll: Zoom
      </div>

    </div>
  );
};

export default App;