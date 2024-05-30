import React, { useEffect, useState, useRef } from 'react';
import { ChessBoard } from '../components/ChessBoard';
import { Button } from '../components/Button';
import { Chess } from 'chess.js';
import { useSocket } from '../hooks/useSocket';

export const INIT_GAME = 'init_game';
export const MOVE = 'move';
export const GAME_OVER = 'game_over';

const GAME_TIME_MS = 5 * 60 * 1000;

export const Game = () => {
  const socket = useSocket();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [color, setColor] = useState('');
  const [moves, setMoves] = useState<String[]>([]);
  const [draw, setDraw] = useState(false);
  const [player1Time, setPlayer1Time] = useState(GAME_TIME_MS);
  const [player2Time, setPlayer2Time] = useState(GAME_TIME_MS);

  const player1Interval = useRef<number | undefined>(undefined);
  const player2Interval = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      switch (message.type) {
        case INIT_GAME:
          setBoard(chess.board());
          setStarted(true);
          setColor(message.payload.color);
          console.log("Game initialized");
          startTimer(message.payload.color === 'white');
          break;
        case MOVE:
          const move = message.payload.move;
          const moveResult = chess.move(move);
          if (moveResult) {
            setMoves(chess.history());
            setBoard(chess.board());
            setPlayer1Time(GAME_TIME_MS - message.payload.player1TimeConsumed);
            setPlayer2Time(GAME_TIME_MS - message.payload.player2TimeConsumed);
            switchTimers();
            console.log("Move made");
          }
          break;
        case GAME_OVER:
          if (message.payload.draw) {
            setDraw(true);
          } else {
            setColor(message.payload.winner);
          }
          setStarted(false);
          setFinished(true);
          clearTimers();
          console.log("Game over");
          break;
      }
    };
  }, [socket]);

  const startTimer = (isWhite: boolean) => {
    clearTimers();
    player1Interval.current = window.setInterval(() => {
      setPlayer1Time((prevTime) => prevTime - 1000);
    }, 1000);
  };

  const switchTimers = () => {
    clearTimers();
    if (chess.turn() === 'b') {
      player2Interval.current = window.setInterval(() => {
        setPlayer2Time((prevTime) => prevTime - 1000);
      }, 1000);
    } else {
      player1Interval.current = window.setInterval(() => {
        setPlayer1Time((prevTime) => prevTime - 1000);
      }, 1000);
    }
  };

  const clearTimers = () => {
    if (player1Interval.current) clearInterval(player1Interval.current);
    if (player2Interval.current) clearInterval(player2Interval.current);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className='justify-center flex'>
      <div className="pt-8 max-w-screen-lg w-full">
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-4 w-full flex justify-center">
            <ChessBoard
              chess={chess}
              setBoard={setBoard}
              socket={socket}
              board={board}
              setMoves={setMoves}
              started={started}
              finished={finished}
              color={color}
              switchTimers={switchTimers}
            />
          </div>

          <div className="col-span-2 bg-slate-700 w-full flex justify-center">
            <div className="pt-6">
              {!started && !finished && (
                <Button onClick={() => socket.send(JSON.stringify({ type: INIT_GAME }))}>Play</Button>
              )}
              {started && (
                <div className="">
                  <div className={`${color === 'white' ? 'text-white' : ''} font-bold`}>You're playing as {color}</div>
                  <div className="text-white scroll-auto">Moves:</div>
                  {moves.map((move, index) => (
                    <li key={index} className='text-white font-bold'>{JSON.stringify(move)}</li>
                  ))}
                  <div className="text-white">White Time: {formatTime(player1Time)}</div>
                  <div className="text-white">Black Time: {formatTime(player2Time)}</div>
                </div>
              )}
              {finished && (
                <div className="">
                  <div className={`${color === 'white' ? 'text-white' : ''} font-bold`}>
                    {draw ? 'Game has drawn' : `Checkmate!!! ${color} has won!`}
                  </div>
                  <div className="text-white scroll-auto">Moves:</div>
                  {moves.map((move, index) => (
                    <li key={index} className='text-white font-bold'>{JSON.stringify(move)}</li>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
