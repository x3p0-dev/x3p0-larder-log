import type { IconOption } from '../lib/icons';
import type { Theme } from '../lib/theme';

type Props = {
	options: IconOption[];
	value: string | undefined;
	onChange: (key: string) => void;
	activeColor: string;
	theme: Theme;
};

/** Grid of selectable icons, tinted with the color currently being picked. */
export function IconPicker({ options, value, onChange, activeColor, theme }: Props) {
	return (
		<div class="grid grid-cols-5 gap-1 mb-2">
			{options.map(({ key, Icon }) => {
				const active = value === key;
				return (
					<button
						key={key}
						type="button"
						onClick={() => onChange(key)}
						class="aspect-square rounded flex items-center justify-center"
						style={{ background: active ? activeColor : theme.neutralChipBg, color: active ? '#fff' : theme.text }}
						aria-label={key}
						aria-pressed={active}
					>
						<Icon size={14} />
					</button>
				);
			})}
		</div>
	);
}
