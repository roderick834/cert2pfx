export default function MemoryCard({ memory, currentUserId, onDelete }) {
  const isMe = memory.user_id === currentUserId;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const typeLabel = {
    photo: '📷 Photo',
    video: '🎬 Video',
    text: '📝 Text',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in">
      {memory.type === 'photo' && memory.file_path && (
        <img
          src={memory.file_path}
          alt="memory"
          className="w-full object-cover max-h-72"
          loading="lazy"
        />
      )}
      {memory.type === 'video' && memory.file_path && (
        <video
          src={memory.file_path}
          controls
          className="w-full max-h-72 bg-black"
        />
      )}
      <div className="p-4">
        {memory.content && (
          <p className="text-gray-700 text-sm leading-relaxed mb-3">{memory.content}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400 space-y-0.5">
            <div>{isMe ? 'You' : memory.username} • {typeLabel[memory.type]}</div>
            <div>{formatDate(memory.date || memory.created_at)}</div>
          </div>
          {isMe && onDelete && (
            <button
              onClick={() => onDelete(memory.id)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
