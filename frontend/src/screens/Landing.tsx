import { useNavigate } from "react-router-dom";

export const Landing = () => {
  const navigate = useNavigate();
  return (
    <div className="pt-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex justify-center">
          <img className="max-w-96" src="https://images.chesscomfiles.com/uploads/v1/images_users/tiny_mce/lularobs/phpwTRaB7.png" alt="Chess board" />
        </div>
        <div className="pt-16">
          <h1 className="text-4xl font-bold text-white">Play chess online on the best site!</h1>
          <div className="flex justify-center"></div>

          <div className="mt-4">
            <button onClick={() => navigate("/game")} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" >Play now</button>
          </div>
        </div>
      </div>
    </div>
  );
};