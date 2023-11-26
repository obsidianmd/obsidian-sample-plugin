import { SendHorizontal } from "lucide-react";
import React, { useState } from "react";

interface MessageInputProps {
	onMessageSend: (message: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onMessageSend }) => {
	const [newMessage, setNewMessage] = useState("");

	const handleSend = () => {
		onMessageSend(newMessage);
		setNewMessage("");
	};

	return (
		<div className="message-input container">
			<textarea
				className="message-input input"
				placeholder="Type your message here..."
				value={newMessage}
				onChange={(e) => setNewMessage(e.target.value)}
			/>
			<button className="message-input send" onClick={handleSend}>
				<SendHorizontal size={16} />
			</button>
		</div>
	);
};

export default MessageInput;
