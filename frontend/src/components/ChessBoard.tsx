import { Color, PieceSymbol, Square } from "chess.js"
import { useState } from "react";
import { MOVE } from "../screens/Game";

export const ChessBoard = ({chess, setBoard,board, socket}:{
    setBoard:any;
    chess:any;
    board:({
    square:Square;
    type:PieceSymbol;
    color:Color;
} | null)[][];
socket:WebSocket}) => {

    const [from,setFrom] = useState<null | Square>(null);
    return (
        <>
    <div className="text-white-200">
        {
            board.map((row,i) => {
                return <div className="flex" key={i}>
                    {
                        row.map((square,j) => {
                            return <div onClick={()=>{
                                const squareRepresentation = String.fromCharCode(97 + (j%8))+""+(8-i) as Square;
                                if(!from) setFrom(squareRepresentation);
                                else{
                                
                                    socket.send(JSON.stringify({
                                        type:MOVE,
                                        payload:{
                                            move:{from,to:squareRepresentation}
                                        }
                                    }))

                                    setFrom(null);
                                    chess.move({
                                        from,to:squareRepresentation
                                    });
                                    setBoard(chess.board());
                                }
                            }}
                            className={`w-16 h-16 ${(i+j) % 2 === 0 ? 'bg-green-700':'bg-white'}`} key={j}>
                                <div className="w-full justify-center flex h-full">
                                    <div className="h-full flex flex-col justify-center">{square ? 
                                    <img className="w-12" src={`/${square?.color === 'b' ? square?.type : `${square?.type?.toUpperCase()} copy`}.png`}></img> : null}</div></div>
                            </div>
                        })
                    }
                </div>
            })
        }
    </div>
        </>
    )
}