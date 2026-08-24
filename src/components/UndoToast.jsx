export function UndoToast({ item, onUndo, theme }) {
	if (! item) return null;

	return (
		<div
			role="status"
			className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full"
			style={{ background: theme.inkBg, color: theme.inkText, boxShadow: '0 6px 20px -4px rgba(0,0,0,0.3)' }}
		>
			<span className="text-sm">Removed &ldquo;{item.name}&rdquo;</span>
			<button onClick={onUndo} className="text-sm font-semibold underline">Undo</button>
		</div>
	);
}
