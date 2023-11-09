import React, { useState } from 'react';

const PluginView = () => {
    const [messages, setMessages] = useState([
        {
            type: 'received',
            text: `# Please send me a message indicating the following:\n- The type of writing (e.g. essay, blog post, etc.)\n- Topic\n- Audience\n- Length (in words)\n- Structure (optional) (e.g. introduction, body, conclusion)`
        },
        {
            type: 'sent',
            text: 'Hello, how are you?'
        }
    ]);
    const [newMessage, setNewMessage] = useState('');

    const handleSend = () => {
        setMessages([...messages, { type: 'sent', text: newMessage }]);
        setNewMessage('');
    };

    return (
        <div className="agent-view-container">
            <h2>Writing Assistant</h2>
            <div className="chat-container">
                {messages.map((message, index) => (
                    <div key={index} className={`chat-message ${message.type}`}>
                        <p className="text" dangerouslySetInnerHTML={{ __html: message.text.replace(/\n-/g, '<br/>-') }} />
                    </div>
                ))}
            </div>
            <div className="chat-input container">
                <textarea 
                    className="chat-input input"
                    placeholder="Type your message here..." 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                />
                <button className="chat-input send" onClick={handleSend}>Send</button>
            </div>
        </div>
    );
};

export default PluginView;