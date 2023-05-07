import Avatar from "./Avatar";

export default function Contact({ id, username, onClick, selected, online }) {
  return (
    <div
      key={id}
      onClick={() => onClick(id)}
      className={
        "flex items-center gap-2 cursor-pointer py-2  " +
        (selected ? "bg-blue-400" : "")
      }
    >
      {selected && (
        <div className="w-10 bg-yellow-400 h-10 rounded-r-3xl"></div>
      )}
      <div className="flex gap-2 py-2 items-center"></div>
      <Avatar online={online} username={username} userId={id} />
      <span className="text-gray-800">{username}</span>
    </div>
  );
}
