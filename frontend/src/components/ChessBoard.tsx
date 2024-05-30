import { Color, PieceSymbol, Square } from "chess.js";
import { useState } from "react";
import { MOVE } from "../screens/Game";
import { ToastContainer, toast } from 'react-toastify';

export const ChessBoard = ({ chess, setBoard, board, socket, setMoves, started, finished, color, switchTimers }: {
    setBoard: any;
    chess: any;
    board: ({
        square: Square;
        type: PieceSymbol;
        color: Color;
    } | null)[][];
    socket: WebSocket;
    setMoves: any;
    started: Boolean;
    finished: Boolean;
    color: String;
    switchTimers: () => void;
}) => {
    const [from, setFrom] = useState<null | Square>(null);

    const renderBoard = () => {
        const displayedBoard = color === 'black' ? board.slice().reverse().map(row => row.slice().reverse()) : board;

        return displayedBoard.map((row, i) => (
            <div className="flex" key={i}>
                {row.map((square, j) => {
                    const actualI = color === 'black' ? 7 - i : i;
                    const actualJ = color === 'black' ? 7 - j : j;
                    const squareRepresentation = String.fromCharCode(97 + actualJ) + (8 - actualI) as Square;
                    return (
                        <div
                            onClick={() => handleSquareClick(squareRepresentation)}
                            className={`w-16 h-16 ${(i + j) % 2 === 0 ? 'bg-green-700' : 'bg-white'}`}
                            key={j}
                        >
                            <div className="w-full justify-center flex h-full">
                                <div className={`h-full flex flex-col justify-center ${square?.color === 'w' ? '' : ''}`}>
                                    {square ? (
                                        <img
                                            className={`${square?.type === 'q' || square?.type === 'k' ? 'w-11' : square?.type === 'n' ? 'w-10' : 'w-8'}`}
                                            src={`/${square?.color === 'b' ? square?.type : `${square?.type?.toUpperCase()} copy`}.svg`}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        ));
    };

    const handleSquareClick = (squareRepresentation: Square) => {
        if (started) {
            if (!from) {
                setFrom(squareRepresentation);
            } else {
                const madeMove = { from, to: squareRepresentation };
                socket.send(
                    JSON.stringify({
                        type: MOVE,
                        payload: {
                            move: madeMove,
                        },
                    })
                );
                setFrom(null);
                const moveResult = chess.move(madeMove);
                setBoard(chess.board());
                setMoves(chess.history());
                switchTimers(); // Switch timers when a move is made
            }
        } else {
            if (finished) {
                toast.warning("Game has ended");
            } else {
                toast.warning("Game not started yet");
            }
        }
    };

    return (
        <>
            <ToastContainer />
            <div className="text-white-200">{renderBoard()}</div>
        </>
    );
};
