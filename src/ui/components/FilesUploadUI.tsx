import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../AppView";
import { FileSuggest } from "./suggesters/FileSuggester";
import { ClipboardCopy, ChevronDown, ChevronRight, Trash } from "lucide-react";

interface FilesUploadUIProps {
	files: string[];
	onAddFile: (file: string) => void;
	onRemoveFile: (file: string) => void;
}

const FilesUploadUI = ({
	files,
	onAddFile,
	onRemoveFile,
}: FilesUploadUIProps) => {
	const [isExpanded, setIsExpanded] = useState(true);

	const [newFile, setNewFile] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const app = useApp();

	if (!app) {
		return null;
	}

	const copyTitle = (file: string) => {
		navigator.clipboard.writeText(`[[${file}]]`);
	};

	useEffect(() => {
		if (inputRef.current) {
			new FileSuggest(app, inputRef.current, handleAddFile);
		}
	}, [inputRef.current]);

	const handleAddFile = (file: string) => {
		onAddFile(file);
		setNewFile("");
	};

	return (
		<div className="collapsible-container">
			<div
				className="collapsible-header"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<span className="arrow">
					{isExpanded ? (
						<ChevronRight size={16} />
					) : (
						<ChevronDown size={16} />
					)}
				</span>
				<span className="label">Uploaded Files</span>
			</div>
			{isExpanded && (
				<div className="collapsible-content">
					<div className="file-input-container">
						<input
							ref={inputRef}
							type="text"
							placeholder="Add a file..."
							value={newFile}
							onChange={(e) => setNewFile(e.target.value)}
						/>
						{/* <button onClick={() => handleAddFile(newFile)}>
                            <Plus size={16} />
                        </button> */}
					</div>
					<div className="files-list">
						{files.map(
							(file, index) => (
								,
								(
									<div key={index} className="file-row">
										<span>{file}</span>
										<div className="button-group">
											<button
												onClick={() => copyTitle(file)}
											>
												<ClipboardCopy size={16} />
											</button>
											<button
												onClick={() =>
													onRemoveFile(file)
												}
											>
												<Trash size={16} />
											</button>
										</div>
									</div>
								)
							)
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default FilesUploadUI;
