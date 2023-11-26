import React, { useEffect, useRef } from "react";
import { DropdownComponent } from "obsidian";

interface ISelectOption {
	label: string;
	value: string;
}
interface DropdownSelectProps {
	items: ISelectOption[];
	onChange: (item: string) => void;
	activeItem: string;
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({
	items,
	onChange,
	activeItem,
}) => {
	const selectElementRef = useRef<HTMLSelectElement>(null);

	useEffect(() => {
		if (selectElementRef.current) {
			new DropdownComponent(selectElementRef.current);
		}
	}, [selectElementRef.current]);

	return (
		<select
			ref={selectElementRef}
			onChange={(e) => onChange(e.target.value)}
			value={activeItem}
			className={"dropdown-select"}
		>
			{items.map((item) => (
				<option className="" key={item.value} value={item.value}>
					{item.label}
				</option>
			))}
		</select>
	);
};

export default DropdownSelect;
