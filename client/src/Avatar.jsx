export default function Avatar({ userId, username, online }) {
  const color = [
    "bg-green-300",
    "bg-voilet-300",
    "bg-pink-300",
    "bg-blue-300",
    "bg-yellow-300",
    "bg-red-300",
  ];

  const userIdBase10 = parseInt(userId, 16);
  const colIndex = userIdBase10 % color.length;
  const col = color[colIndex];

  return (
    <div className={"w-20 h-20 relative rounded-full flex items-center " + col}>
      <div className="text-center w-full opacity-70">{username}</div>
      {online && (
        <div className="absolute w-5 h-5 bg-green-500 bottom-1 right-1 rounded-full"></div>
      )}
      {!online && (
        <div className="absolute w-5 h-5 bg-gray-500 bottom-1 right-1 rounded-full"></div>
      )}
    </div>
  );
}
