import { X } from 'lucide-react';
import { statusFor } from '../lib/theme.js';

export function ShoppingListModal({ open, store, items, onClose, dark, theme }) {
	if (! open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ background: 'rgba(0,0,0,0.45)' }}
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label={`Shopping list for ${store}`}
		>
			<div
				className="w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-xl p-5"
				style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between mb-4">
					<div>
						<p className="mono text-xs uppercase tracking-widest" style={{ color: theme.textMuted }}>Shopping list</p>
						<h2 className="disp text-lg font-semibold" style={{ color: theme.textStrong }}>{store}</h2>
					</div>
					<button onClick={onClose} aria-label="Close" style={{ color: theme.textMuted }}>
						<X size={18} />
					</button>
				</div>

				{items.length === 0 ? (
					<p className="text-sm py-6 text-center" style={{ color: theme.textMuted }}>
						You&rsquo;re fully stocked at {store}!
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{items.map((it) => {
							const s = statusFor(it.qty, it.threshold, dark);
							return (
								<div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md" style={{ background: theme.surfaceAlt }}>
									<span className="text-sm" style={{ color: theme.text }}>{it.name}</span>
									<span className="mono text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: s.bg, color: s.ink }}>{s.label}</span>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
