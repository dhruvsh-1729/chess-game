import { WebSocket } from "ws";
import { Chess, Square, Move } from 'chess.js'
import { GAME_ENDED, GAME_OVER, INIT_GAME, MOVE } from "./messages";

type GAME_STATUS = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'TIME_UP';
type GAME_RESULT = "WHITE_WINS" | "BLACK_WINS" | "DRAW";

const GAME_TIME_MS = 5 * 60 * 1000;

export function isPromoting(chess: Chess, from: Square, to: Square) {
    if (!from) {
        return false;
    }

    const piece = chess.get(from);

    if (piece?.type !== 'p') {
        return false;
    }

    if (piece.color !== chess.turn()) {
        return false;
    }

    if (!['1', '8'].some((it) => to.endsWith(it))) {
        return false;
    }

    return chess
        .moves({ square: from, verbose: true })
        .map((it) => it.to)
        .includes(to);
}

export class Game {
    public player1: WebSocket;
    public player2: WebSocket;
    public board: Chess;
    private moves: string[];
    private moveCount = 0;
    private timer: NodeJS.Timeout | null = null;
    private moveTimer: NodeJS.Timeout | null = null;
    public result: GAME_RESULT | null = null;
    private player1TimeConsumed = 0;
    private player2TimeConsumed = 0;
    private startTime = new Date(Date.now());
    private lastMoveTime = new Date(Date.now());

    constructor(player1: WebSocket, player2: WebSocket) {
        this.player1 = player1;
        this.player2 = player2;
        this.board = new Chess();
        this.moves = [];

        this.player1.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: "white"
            }
        }));

        this.player2.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: "black"
            }
        }));
    }

    seedMoves(moves: {
        id: string;
        gameId: string;
        moveNumber: number;
        from: string;
        to: string;
        comments: string | null;
        timeTaken: number | null;
        createdAt: Date;
    }[]) {
        console.log(moves);
        moves.forEach((move) => {
            if (
                isPromoting(this.board, move.from as Square, move.to as Square)
            ) {
                this.board.move({
                    from: move.from,
                    to: move.to,
                    promotion: 'q',
                });
            } else {
                this.board.move({
                    from: move.from,
                    to: move.to,
                });
            }
        });
        this.moveCount = moves.length;
        if (moves[moves.length - 1]) {
            this.lastMoveTime = moves[moves.length - 1].createdAt;
        }

        moves.map((move, index) => {
            if (move.timeTaken) {
                if (index % 2 === 0) {
                    this.player1TimeConsumed += move.timeTaken;
                } else {
                    this.player2TimeConsumed += move.timeTaken;
                }
            }
        });
        this.resetAbandonTimer();
        this.resetMoveTimer();
    }

    async resetAbandonTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.endGame("ABANDONED", this.board.turn() === 'b' ? 'WHITE_WINS' : 'BLACK_WINS');
        }, 60 * 1000);
    }

    async resetMoveTimer() {
        if (this.moveTimer) {
            clearTimeout(this.moveTimer)
        }
        const turn = this.board.turn();
        const timeLeft = GAME_TIME_MS - (turn === 'w' ? this.player1TimeConsumed : this.player2TimeConsumed);

        this.moveTimer = setTimeout(() => {
            this.endGame("TIME_UP", turn === 'b' ? 'WHITE_WINS' : 'BLACK_WINS');
        }, timeLeft);
    }

    endGame(status: GAME_STATUS, result: GAME_RESULT) {
        // clear timers
        this.clearTimer();
        this.clearMoveTimer();
    }

    clearMoveTimer() {
        if (this.moveTimer) clearTimeout(this.moveTimer);
    }

    setTimer(timer: NodeJS.Timeout) {
        this.timer = timer;
    }

    clearTimer() {
        if (this.timer) clearTimeout(this.timer);
    }

    makeMove(socket: WebSocket, move: Move) {
        //validation here
        if (this.board.turn() === 'w' && socket !== this.player1) return;
        if (this.board.turn() === 'b' && socket !== this.player2) return;
        //is it the users move?
        if (this.result) {
            console.error(`User is making a move post game completion`);
            return;
        }
        const moveTimestamp = new Date(Date.now());

        // is the move valid
        try {
            if (isPromoting(this.board, move.from, move.to)) {
                this.board.move({
                    from: move.from,
                    to: move.to,
                    promotion: 'q',
                });
            }
            else {
                this.board.move({
                    from: move.from,
                    to: move.to,
                });
            }
        }
        catch (e: any) {
            console.log(e.message);
        }

        // flipped because move has already happened
        if (this.board.turn() === 'b') {
            this.player1TimeConsumed = this.player1TimeConsumed + (moveTimestamp.getTime() - this.lastMoveTime.getTime());
        }

        if (this.board.turn() === 'w') {
            this.player2TimeConsumed = this.player2TimeConsumed + (moveTimestamp.getTime() - this.lastMoveTime.getTime());
        }

        this.resetAbandonTimer()
        this.resetMoveTimer();

        this.lastMoveTime = moveTimestamp;

        //update the board
        if (this.board.isGameOver()) {
            const result = this.board.isDraw()
                ? 'DRAW'
                : this.board.turn() === 'b'
                    ? 'WHITE_WINS'
                    : 'BLACK_WINS';

            if (result === 'DRAW') {
                this.player1.send(JSON.stringify({
                    type: GAME_OVER,
                    payload: {
                        winner: this.board.turn() === "w" ? "black" : "white",
                        draw: true
                    }
                }))
                this.player2.send(JSON.stringify({
                    type: GAME_OVER,
                    payload: {
                        winner: this.board.turn() === "w" ? "black" : "white",
                        draw: true
                    }
                }))
            }
            else {
                this.player1.send(JSON.stringify({
                    type: GAME_OVER,
                    payload: {
                        winner: this.board.turn() === "w" ? "black" : "white",
                        draw: false
                    }
                }))
                this.player2.send(JSON.stringify({
                    type: GAME_OVER,
                    payload: {
                        winner: this.board.turn() === "w" ? "black" : "white",
                        draw: false
                    }
                }))
            }


        }

        if (this.moveCount % 2 === 0) {
            this.player2.send(JSON.stringify({
                type: MOVE,
                payload: {move,player1TimeConsumed: this.player1TimeConsumed, player2TimeConsumed: this.player2TimeConsumed}
            }))
        }
        else {
            this.player1.send(JSON.stringify({
                type: MOVE,
                payload: {move,player1TimeConsumed: this.player1TimeConsumed, player2TimeConsumed: this.player2TimeConsumed}
            }))
        }

        this.moveCount++;
    }
}