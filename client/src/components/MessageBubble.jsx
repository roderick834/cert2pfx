export default function MessageBubble({ message, currentUserId, stickers = [] }) {
  const isMe = message.sender_id === currentUserId;
  const sticker = message.sticker_id
    ? stickers.find((s) => s.id === message.sticker_id)
    : null;

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {sticker ? (
          <img
            src={sticker.image_data}
            alt={sticker.name}
            className="w-24 h-24 object-contain rounded-2xl animate-bounce-in"
          />
        ) : (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm animate-fade-in ${
              isMe
                ? 'bg-rose-500 text-white rounded-br-sm'
                : 'bg-white text-gray-700 rounded-bl-sm border border-gray-100'
            }`}
          >
            {message.content}
          </div>
        )}
        <span className="text-xs text-gray-400 mt-1 px-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
