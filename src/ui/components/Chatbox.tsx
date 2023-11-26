import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import OpenAI from 'openai';
import { ChevronDown, ClipboardCopy } from 'lucide-react';
import BeatLoader from 'react-spinners/BeatLoader';
import { Tooltip } from 'react-tooltip';
import Markdown from 'react-markdown';
import { useApp } from '../AppView';
import { createNotice } from '@/utils/Logs';
import { TFile } from 'obsidian';
import { ThreadAnnotationFile } from '../types';

const override: CSSProperties = {
    display: 'block',
    margin: '0 auto',
    borderColor: 'white',
};

interface ChatboxProps {
    messages: OpenAI.Beta.Threads.ThreadMessage[];
    isResponding: boolean;
    annotationFiles?: ThreadAnnotationFile[];
}

const Chatbox = ({ annotationFiles, isResponding, messages }: ChatboxProps) => {
    const app = useApp();
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight;
            checkScrollButtonVisibility();
        }

        const handleScroll = () => {
            checkScrollButtonVisibility();
        };

        if (messagesContainerRef.current) {
            scrollToBottom();
            messagesContainerRef.current.addEventListener(
                'scroll',
                handleScroll,
            );
        }

        return () => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.removeEventListener(
                    'scroll',
                    handleScroll,
                );
            }
        };
    }, [isResponding, messagesContainerRef.current]);

    useEffect(() => {
        // scroll to bottom when switching to different thread
        if (showScrollButton) {
            scrollToBottom();
            setShowScrollButton(false);
        }
    }, [messages]);

    const getGroupMessages = () =>
        messages.map((message, index) => (
            <div key={index} className={`chat-message ${message.role}`}>
                {message.content.map((content, index) => {
                    if (content.type === 'text') {
                        const getMessageText = () => {
                            const annotationsTexts =
                                content.text.annotations.map(
                                    (annotation: any) => annotation.text,
                                );
                            let text = content.text.value;

                            annotationsTexts.forEach(
                                (annotationText: string, index: number) => {
                                    const annotationIndex = index;
                                    const regex = new RegExp(
                                        annotationText,
                                        'g',
                                    );
                                    text = text.replace(
                                        regex,
                                        `[^${annotationIndex}]`,
                                    );
                                },
                            );

                            return text;
                        };

                        const renderAnnotation = (
                            annotation: any,
                            index: number,
                        ) => {
                            const { file_citation } = annotation;
                            const fileId = file_citation?.file_id;
                            const fileName = annotationFiles?.find(
                                (file) => file.fileId === fileId,
                            )?.fileName;
                            let quote = file_citation?.quote;

                            // Check if quote has list markdown syntax
                            if (quote && quote.includes('- ')) {
                                quote = quote.replace(/- /g, '\n- ');
                            }

                            const handleAnnotationClick = () => {
                                // open new tab and then navigate to fil
                                console.log(
                                    'handleAnnotationClick',
                                    app,
                                    fileName,
                                );
                                if (app && fileName) {
                                    const file =
                                        app.vault.getAbstractFileByPath(
                                            fileName,
                                        );
                                    if (file && file instanceof TFile) {
                                        app.workspace.getLeaf().openFile(file);
                                    }
                                    // add leaf to parent
                                }
                            };

                            return (
                                <div key={index}>
                                    <a
                                        className="annotation"
                                        data-tooltip-id={`tooltip-${index}`}
                                        onClick={handleAnnotationClick}
                                    >
                                        [^{index}]
                                    </a>
                                    <Tooltip id={`tooltip-${index}`}>
                                        <div className="annotation-tooltip-container">
                                            <strong>{fileName}</strong>
                                            <Markdown>{quote}</Markdown>
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        };

                        const renderContent = () => {
                            const text = getMessageText();
                            const copyText = () => {
                                navigator.clipboard.writeText(text);
                                createNotice('Copied to clipboard!', 2000);
                            };
                            return (
                                <div key={index} className="message-content">
                                    {
                                        <Markdown className="message-text">
                                            {text}
                                        </Markdown>
                                    }
                                    <div className="message-footer">
                                        {message.role === 'assistant' && (
                                            <div className="copy-icon-container">
                                                <ClipboardCopy
                                                    className="copy-icon"
                                                    color={'#ffffff'}
                                                    size={16}
                                                    onClick={copyText}
                                                />
                                            </div>
                                        )}
                                        {content.text.annotations.map(
                                            (annotation: any, index: number) =>
                                                renderAnnotation(
                                                    annotation,
                                                    index,
                                                ),
                                        )}
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <div key={index} className="message-content">
                                {renderContent()}
                            </div>
                        );
                    }
                })}
            </div>
        ));

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight;
            checkScrollButtonVisibility();
        }
    };

    const checkScrollButtonVisibility = () => {
        if (messagesContainerRef.current) {
            const containerHeight = messagesContainerRef.current.offsetHeight;
            const scrollHeight = messagesContainerRef.current.scrollHeight;
            const scrollTop = messagesContainerRef.current.scrollTop;
            const gap = scrollHeight - scrollTop - containerHeight;
            setShowScrollButton(gap > containerHeight);
        }
    };

    return (
        <div className="chatbox-container">
            <div ref={messagesContainerRef} className="messages-container">
                {getGroupMessages()}
                {isResponding && (
                    <div className="loader-container">
                        <BeatLoader
                            color="#ffffff"
                            loading={true}
                            cssOverride={override}
                            size={12}
                        />
                    </div>
                )}
            </div>
            {showScrollButton && (
                <button
                    className="scroll-to-bottom-button"
                    onClick={scrollToBottom}
                >
                    <ChevronDown size={16} />
                </button>
            )}
        </div>
    );
};

export default Chatbox;
